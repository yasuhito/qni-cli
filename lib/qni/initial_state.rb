# frozen_string_literal: true

require_relative 'angle_expression'

module Qni
  # Structured 1-qubit initial state vector representation.
  class InitialState
    # Raised when an initial state cannot be parsed or resolved safely.
    class Error < StandardError; end
    PLUS_MINUS_COEFFICIENT_TEXT = Math.sqrt(0.5).to_s
    NEGATED_PLUS_MINUS_COEFFICIENT_TEXT = (-Math.sqrt(0.5)).to_s
    IMAGINARY_NUMERIC_PATTERN = /\A(?<real>[+-]?\d+(?:\.\d+)?)i\z/
    # Resolves initial-state coefficient strings into numeric amplitudes.
    class NumericResolver
      def initialize(variables)
        @variables = variables
      end

      def resolve(coefficient)
        return coefficient.to_f if coefficient.match?(AngleExpression::NUMERIC_PATTERN)
        return imaginary_numeric(coefficient) if coefficient.match?(InitialState::IMAGINARY_NUMERIC_PATTERN)

        signed_identifier = Term::SIGNED_IDENTIFIER_PATTERN.match(coefficient)
        if signed_identifier
          return signed_identifier_value(sign: signed_identifier[:sign], identifier: signed_identifier[:identifier])
        end

        resolve_identifier(coefficient)
      end

      private

      attr_reader :variables

      def imaginary_numeric(coefficient)
        Complex(0, InitialState::IMAGINARY_NUMERIC_PATTERN.match(coefficient)[:real].to_f)
      end

      def signed_identifier_value(sign:, identifier:)
        { '+' => 1.0, '-' => -1.0 }.fetch(sign) * resolve_identifier(identifier)
      end

      def resolve_identifier(identifier)
        expression = resolved_expression(identifier)
        raise Error, "variable value must be concrete: #{identifier}" unless expression.concrete?

        expression.radians
      rescue AngleExpression::Error => e
        raise Error, e.message
      end

      def resolved_expression(identifier)
        resolved_value = variables.fetch(identifier) do
          raise Error, "unresolved initial state variable: #{identifier}"
        end
        AngleExpression.new(resolved_value)
      end
    end

    # Single term in a 1-qubit initial-state ket sum.
    class Term
      TERM_PATTERN = /\A(?<coefficient>.+)\|(?<basis>[01])>\z/
      SIGNED_IDENTIFIER_PATTERN = /\A(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\z/

      def self.from_h(data)
        new(
          basis: validated_basis(data.fetch('basis')),
          coefficient: validated_coefficient(data.fetch('coefficient'))
        )
      end

      def self.parse(raw_value)
        match = TERM_PATTERN.match(raw_value)
        raise Error, "invalid initial state term: #{raw_value}" unless match

        new(
          basis: validated_basis(match[:basis]),
          coefficient: validated_coefficient(match[:coefficient])
        )
      end

      def self.validated_basis(raw_basis)
        basis = raw_basis.to_s
        return basis if %w[0 1].include?(basis)

        raise Error, "unsupported basis state: #{basis}"
      end

      def self.validated_coefficient(raw_coefficient)
        coefficient = raw_coefficient.to_s.strip
        return coefficient if supported_coefficient?(coefficient)

        raise Error, "invalid initial state coefficient: #{coefficient}"
      end

      def self.supported_coefficient?(coefficient)
        [
          AngleExpression::IDENTIFIER_PATTERN,
          SIGNED_IDENTIFIER_PATTERN,
          AngleExpression::NUMERIC_PATTERN,
          IMAGINARY_NUMERIC_PATTERN
        ].any? { |pattern| coefficient.match?(pattern) }
      end

      attr_reader :basis, :coefficient

      def initialize(basis:, coefficient:)
        @basis = basis
        @coefficient = coefficient
      end

      def to_h
        { 'basis' => basis, 'coefficient' => coefficient }
      end

      def to_s
        "#{coefficient}|#{basis}>"
      end
    end

    FORMAT = 'ket_sum_v1'
    NORMALIZATION_TOLERANCE = 1e-12
    def self.zero
      new(terms: [Term.new(basis: '0', coefficient: '1')])
    end

    def self.from_h(data)
      format = data.fetch('format')
      raise Error, "unsupported initial state format: #{format}" unless format == FORMAT

      new(terms: data.fetch('terms').map { |term| Term.from_h(term) })
    end

    def self.parse(raw_value)
      special_state_for(raw_value) || parse_ket_sum(raw_value)
    end

    def self.special_state_for(raw_value)
      case raw_value.to_s.strip
      when '|+>' then superposition_state(PLUS_MINUS_COEFFICIENT_TEXT)
      when '|->' then superposition_state(NEGATED_PLUS_MINUS_COEFFICIENT_TEXT)
      when '|+i>' then superposition_state("#{PLUS_MINUS_COEFFICIENT_TEXT}i")
      when '|-i>' then superposition_state("-#{PLUS_MINUS_COEFFICIENT_TEXT}i")
      end
    end

    def self.superposition_state(one_coefficient)
      new(
        terms: [
          Term.new(basis: '0', coefficient: PLUS_MINUS_COEFFICIENT_TEXT),
          Term.new(basis: '1', coefficient: one_coefficient)
        ]
      )
    end

    def self.normalize_text(raw_value)
      raw_value.to_s.gsub('α', 'alpha')
               .gsub('β', 'beta')
               .strip
               .gsub(/\s+/, ' ')
               .gsub(/\s*-\s*/, ' + -')
               .gsub(/\s*\+\s*/, ' + ')
    end

    def self.parse_ket_sum(raw_value)
      normalized = normalize_text(raw_value)
      raise Error, 'initial state is required' if normalized.empty?

      new(terms: normalized.split(' + ').map { |term| Term.parse(term) })
    end

    def initialize(terms:)
      grouped_terms = terms.group_by(&:basis)
      duplicate_basis = grouped_terms.find { |_basis, basis_terms| basis_terms.length > 1 }&.first
      raise Error, "duplicate basis state: #{duplicate_basis}" if duplicate_basis

      @terms = terms.sort_by(&:basis)
    end

    def resolve_numeric(variables)
      resolver = NumericResolver.new(variables)
      amplitudes = terms.each_with_object(Array.new(2, 0.0)) do |term, resolved|
        resolved[term.basis.to_i] = resolver.resolve(term.coefficient)
      end

      ensure_normalized(amplitudes)
      amplitudes
    end

    def to_h
      { 'format' => FORMAT, 'terms' => terms.map(&:to_h) }
    end

    def to_s
      return '|+>' if plus_state?
      return '|->' if minus_state?
      return '|+i>' if plus_i_state?
      return '|-i>' if minus_i_state?

      terms.join(' + ').gsub('+ -', '- ')
    end

    private

    attr_reader :terms

    def ensure_normalized(amplitudes)
      norm = amplitudes.sum { |amplitude| amplitude_norm(amplitude) }
      return if (norm - 1.0).abs <= NORMALIZATION_TOLERANCE

      raise Error, 'initial state must be normalized'
    end

    def plus_state? = shorthand_terms?(PLUS_MINUS_COEFFICIENT_TEXT, PLUS_MINUS_COEFFICIENT_TEXT)

    def minus_state? = shorthand_terms?(PLUS_MINUS_COEFFICIENT_TEXT, NEGATED_PLUS_MINUS_COEFFICIENT_TEXT)

    def plus_i_state? = shorthand_terms?(PLUS_MINUS_COEFFICIENT_TEXT, "#{PLUS_MINUS_COEFFICIENT_TEXT}i")

    def minus_i_state? = shorthand_terms?(PLUS_MINUS_COEFFICIENT_TEXT, "-#{PLUS_MINUS_COEFFICIENT_TEXT}i")

    def shorthand_terms?(expected_zero, expected_one)
      return false unless terms.length == 2
      return false unless terms.map(&:basis) == %w[0 1]

      terms.map(&:coefficient) == [expected_zero, expected_one]
    end

    def amplitude_norm(amplitude)
      return amplitude.abs2 if amplitude.is_a?(Complex)

      amplitude**2
    end
  end
end
