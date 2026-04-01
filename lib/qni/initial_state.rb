# frozen_string_literal: true

require_relative 'angle_expression'

module Qni
  # Structured 1-qubit initial state vector representation.
  class InitialState
    # Raised when an initial state cannot be parsed or resolved safely.
    class Error < StandardError; end
    PLUS_MINUS_COEFFICIENT_TEXT = Math.sqrt(0.5).to_s
    NEGATED_PLUS_MINUS_COEFFICIENT_TEXT = (-Math.sqrt(0.5)).to_s
    BELL_BASIS_FACTOR = Math.sqrt(0.5)
    BELL_PLACEHOLDERS = {
      'Φ+' => '__QNI_BELL_PHI_PLUS__',
      'Φ-' => '__QNI_BELL_PHI_MINUS__',
      'Ψ+' => '__QNI_BELL_PSI_PLUS__',
      'Ψ-' => '__QNI_BELL_PSI_MINUS__'
    }.freeze
    BELL_BASIS_COMPONENTS = {
      'Φ+' => [[0, BELL_BASIS_FACTOR], [3, BELL_BASIS_FACTOR]],
      'Φ-' => [[0, BELL_BASIS_FACTOR], [3, -BELL_BASIS_FACTOR]],
      'Ψ+' => [[1, BELL_BASIS_FACTOR], [2, BELL_BASIS_FACTOR]],
      'Ψ-' => [[1, BELL_BASIS_FACTOR], [2, -BELL_BASIS_FACTOR]]
    }.freeze
    IMAGINARY_NUMERIC_PATTERN = /\A(?<real>[+-]?\d+(?:\.\d+)?)i\z/

    def self.supported_basis?(basis)
      basis_qubit_count(basis).positive?
    end

    def self.basis_qubit_count(basis)
      case basis
      when '0', '1' then 1
      when '00', '01', '10', '11' then 2
      else
        BELL_BASIS_COMPONENTS.key?(basis) ? 2 : 0
      end
    end

    def self.basis_components(basis)
      case basis
      when '0' then [[0, 1.0]]
      when '1' then [[1, 1.0]]
      when '00' then [[0, 1.0]]
      when '01' then [[1, 1.0]]
      when '10' then [[2, 1.0]]
      when '11' then [[3, 1.0]]
      else
        BELL_BASIS_COMPONENTS.fetch(basis)
      end
    end

    def self.bell_shorthand?(basis)
      BELL_PLACEHOLDERS.key?(basis)
    end

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
      TERM_PATTERN = /\A(?<coefficient>.+)\|(?<basis>[^>]+)>\z/
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
        return basis if InitialState.supported_basis?(basis)

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
      when '|Φ+>' then bell_state('Φ+')
      when '|Φ->' then bell_state('Φ-')
      when '|Ψ+>' then bell_state('Ψ+')
      when '|Ψ->' then bell_state('Ψ-')
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

    def self.bell_state(basis)
      new(terms: [Term.new(basis: basis, coefficient: '1')])
    end

    def self.normalize_text(raw_value)
      text = protect_bell_shorthands(raw_value.to_s)
      normalized = text.gsub('α', 'alpha')
                       .gsub('β', 'beta')
                       .strip
                       .gsub(/\s+/, ' ')
                       .gsub(/\s*-\s*/, ' + -')
                       .gsub(/\s*\+\s*/, ' + ')
      restore_bell_shorthands(normalized)
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

      basis_dimensions = terms.map { |term| self.class.basis_qubit_count(term.basis) }.uniq
      raise Error, 'mixed basis dimensions are not supported' if basis_dimensions.length > 1

      @terms = terms.sort_by(&:basis)
    end

    def resolve_numeric(variables)
      resolver = NumericResolver.new(variables)
      amplitudes = Array.new(2**self.class.basis_qubit_count(terms.first.basis), 0.0)
      terms.each do |term|
        coefficient = resolver.resolve(term.coefficient)
        self.class.basis_components(term.basis).each do |index, scale|
          amplitudes[index] += coefficient * scale
        end
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
      return "|#{terms.first.basis}>" if bell_shorthand_state?

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

    def bell_shorthand_state?
      terms.length == 1 && self.class.bell_shorthand?(terms.first.basis) && terms.first.coefficient == '1'
    end

    def self.protect_bell_shorthands(text)
      BELL_PLACEHOLDERS.reduce(text) do |current, (basis, placeholder)|
        current.gsub("|#{basis}>", placeholder)
      end
    end

    def self.restore_bell_shorthands(text)
      BELL_PLACEHOLDERS.reduce(text) do |current, (basis, placeholder)|
        current.gsub(placeholder, "|#{basis}>")
      end
    end

    def amplitude_norm(amplitude)
      return amplitude.abs2 if amplitude.is_a?(Complex)

      amplitude**2
    end
  end
end
