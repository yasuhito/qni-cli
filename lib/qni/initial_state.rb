# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'initial_state/bell_basis'
require_relative 'initial_state/class_methods'
require_relative 'initial_state/numeric_resolver'
require_relative 'initial_state/term'

module Qni
  # Structured initial state vector representation.
  class InitialState
    # Raised when an initial state cannot be parsed or resolved safely.
    class Error < StandardError; end
    PLUS_MINUS_COEFFICIENT_TEXT = Math.sqrt(0.5).to_s
    NEGATED_PLUS_MINUS_COEFFICIENT_TEXT = (-Math.sqrt(0.5)).to_s
    ONE_QUBIT_SPECIAL_STATES = {
      '|+>' => PLUS_MINUS_COEFFICIENT_TEXT,
      '|->' => NEGATED_PLUS_MINUS_COEFFICIENT_TEXT,
      '|+i>' => "#{PLUS_MINUS_COEFFICIENT_TEXT}i",
      '|-i>' => "-#{PLUS_MINUS_COEFFICIENT_TEXT}i"
    }.freeze
    COMPUTATIONAL_BASIS_PATTERN = /\A[01]+\z/
    extend ClassMethods

    FORMAT = 'ket_sum_v1'
    NORMALIZATION_TOLERANCE = 1e-12

    def initialize(terms:)
      raise Error, 'initial state must have at least one term' if terms.empty?

      validate_unique_basis(terms)
      validate_basis_dimensions(terms)
      @terms = terms.sort_by(&:basis)
    end

    def resolve_numeric(variables)
      resolver = NumericResolver.new(variables)
      amplitudes = resolved_amplitudes(resolver)
      ensure_normalized(amplitudes)
      amplitudes
    end

    def to_h
      { 'format' => FORMAT, 'terms' => terms.map(&:to_h) }
    end

    def qubits
      self.class.basis_qubit_count(terms.first.basis)
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

    def validate_unique_basis(terms)
      duplicate_basis = terms.group_by(&:basis).find { |_basis, grouped_terms| grouped_terms.length > 1 }&.first
      raise Error, "duplicate basis state: #{duplicate_basis}" if duplicate_basis
    end

    def validate_basis_dimensions(terms)
      basis_dimensions = terms.map { |term| self.class.basis_qubit_count(term.basis) }.uniq
      raise Error, 'mixed basis dimensions are not supported' if basis_dimensions.length > 1
    end

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
      first_term = terms.first
      terms.length == 1 && self.class.bell_shorthand?(first_term.basis) && first_term.coefficient == '1'
    end

    def amplitude_norm(amplitude)
      return amplitude.abs2 if amplitude.is_a?(Complex)

      amplitude**2
    end

    def resolved_amplitudes(resolver)
      amplitudes = Array.new(2**qubits, 0.0)
      terms.each { |term| accumulate_term_amplitudes(amplitudes, term, resolver) }
      amplitudes
    end

    def accumulate_term_amplitudes(amplitudes, term, resolver)
      coefficient = resolver.resolve(term.coefficient)
      self.class.basis_components(term.basis).each do |index, scale|
        amplitudes[index] += coefficient * scale
      end
    end
  end
end
