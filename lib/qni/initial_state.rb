# frozen_string_literal: true

require_relative 'angle_expression'

module Qni
  # Structured 1-qubit initial state vector representation.
  class InitialState
    # Raised when an initial state cannot be parsed or resolved safely.
    class Error < StandardError; end

    FORMAT = 'ket_sum_v1'
    NORMALIZATION_TOLERANCE = 1e-12
    TERM_PATTERN = /\A(?<coefficient>.+)\|(?<basis>[01])>\z/
    SIGNED_IDENTIFIER_PATTERN = /\A(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\z/

    def self.default_for(qubits)
      raise Error, 'initial state currently supports only 1 qubit' unless qubits == 1

      new(terms: [{ 'basis' => '0', 'coefficient' => '1' }])
    end

    def self.from_h(data)
      return if data.nil?
      raise Error, "unsupported initial state format: #{data.fetch('format')}" unless data.fetch('format') == FORMAT

      terms = data.fetch('terms').map do |term|
        {
          'basis' => validated_basis(term.fetch('basis')),
          'coefficient' => validated_coefficient(term.fetch('coefficient'))
        }
      end

      new(terms:)
    end

    def self.parse(raw_value)
      normalized = normalize_text(raw_value)
      raise Error, 'initial state is required' if normalized.empty?

      terms = normalized.split(' + ').map { |term| parse_term(term) }
      new(terms:)
    end

    def self.normalize_text(raw_value)
      raw_value.to_s.tr('αβ', 'ab')
               .gsub(/\bab\b/, 'alpha')
               .gsub(/\bbb\b/, 'beta')
               .strip
               .gsub(/\s+/, ' ')
               .gsub(/\s*-\s*/, ' + -')
               .gsub(/\s*\+\s*/, ' + ')
    end

    def self.parse_term(term)
      match = TERM_PATTERN.match(term)
      raise Error, "invalid initial state term: #{term}" unless match

      {
        'basis' => validated_basis(match[:basis]),
        'coefficient' => validated_coefficient(match[:coefficient])
      }
    end

    def self.validated_basis(basis)
      value = basis.to_s
      return value if %w[0 1].include?(value)

      raise Error, "unsupported basis state: #{value}"
    end

    def self.validated_coefficient(coefficient)
      value = coefficient.to_s.strip
      return value if value.match?(AngleExpression::IDENTIFIER_PATTERN)
      return value if value.match?(SIGNED_IDENTIFIER_PATTERN)
      return value if value.match?(AngleExpression::NUMERIC_PATTERN)

      raise Error, "invalid initial state coefficient: #{value}"
    end

    def initialize(terms:)
      @terms = deduplicated_terms(terms)
    end

    def resolve_numeric(variables)
      amplitudes = Array.new(2, 0.0)

      terms.each do |term|
        amplitudes[term.fetch('basis').to_i] = resolve_coefficient(term.fetch('coefficient'), variables)
      end

      validate_normalized!(amplitudes)
      amplitudes
    end

    def to_h
      {
        'format' => FORMAT,
        'terms' => terms.map(&:dup)
      }
    end

    def to_s
      terms.map { |term| "#{term.fetch('coefficient')}|#{term.fetch('basis')}>" }
           .join(' + ')
           .gsub('+ -', '- ')
    end

    private

    attr_reader :terms

    def deduplicated_terms(raw_terms)
      grouped = raw_terms.group_by { |term| term.fetch('basis') }
      duplicate_basis = grouped.find { |_basis, basis_terms| basis_terms.length > 1 }&.first
      raise Error, "duplicate basis state: #{duplicate_basis}" if duplicate_basis

      raw_terms.sort_by { |term| term.fetch('basis') }
    end

    def resolve_coefficient(coefficient, variables)
      return coefficient.to_f if coefficient.match?(AngleExpression::NUMERIC_PATTERN)

      signed_identifier = SIGNED_IDENTIFIER_PATTERN.match(coefficient)
      return signed_identifier_value(signed_identifier, variables) if signed_identifier

      resolve_identifier(coefficient, variables)
    end

    def signed_identifier_value(match, variables)
      sign = match[:sign] == '-' ? -1.0 : 1.0
      sign * resolve_identifier(match[:identifier], variables)
    end

    def resolve_identifier(identifier, variables)
      value = variables.fetch(identifier) do
        raise Error, "unresolved initial state variable: #{identifier}"
      end
      expression = AngleExpression.new(value)
      raise Error, "variable value must be concrete: #{identifier}" unless expression.concrete?

      expression.radians
    rescue AngleExpression::Error => e
      raise Error, e.message
    end

    def validate_normalized!(amplitudes)
      norm = amplitudes.sum { |amplitude| amplitude**2 }
      return if (norm - 1.0).abs <= NORMALIZATION_TOLERANCE

      raise Error, 'initial state must be normalized'
    end
  end
end
