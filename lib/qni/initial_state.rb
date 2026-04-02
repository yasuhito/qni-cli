# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'initial_state/amplitude_norm'
require_relative 'initial_state/bell_basis'
require_relative 'initial_state/basis'
require_relative 'initial_state/class_methods'
require_relative 'initial_state/formatter'
require_relative 'initial_state/hash_loader'
require_relative 'initial_state/numeric_resolver'
require_relative 'initial_state/special_state_parser'
require_relative 'initial_state/term'
require_relative 'initial_state/text_normalizer'

module Qni
  # Structured initial state vector representation.
  class InitialState
    # Raised when an initial state cannot be parsed or resolved safely.
    class Error < StandardError; end
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
      Basis.new(terms.first.basis).qubit_count
    end

    def to_s
      Formatter.new(terms).to_s
    end

    private

    attr_reader :terms

    def validate_unique_basis(terms)
      duplicate_basis = terms.group_by(&:basis).find { |_basis, grouped_terms| grouped_terms.length > 1 }&.first
      raise Error, "duplicate basis state: #{duplicate_basis}" if duplicate_basis
    end

    def validate_basis_dimensions(terms)
      basis_dimensions = terms.map { |term| Basis.new(term.basis).qubit_count }.uniq
      raise Error, 'mixed basis dimensions are not supported' if basis_dimensions.length > 1
    end

    def ensure_normalized(amplitudes)
      norm = amplitudes.sum { |amplitude| AmplitudeNorm.new(amplitude).value }
      return if (norm - 1.0).abs <= NORMALIZATION_TOLERANCE

      raise Error, 'initial state must be normalized'
    end

    def resolved_amplitudes(resolver)
      amplitudes = Array.new(2**qubits, 0.0)
      terms.each do |term|
        term.add_to_amplitudes(amplitudes, resolver.resolve(term.coefficient))
      end
      amplitudes
    end
  end
end
