# frozen_string_literal: true

module Qni
  # Validates named-basis support for symbolic state rendering.
  class SymbolicBasisValidator
    def initialize(basis:, qubits:)
      @basis = basis
      @qubits = qubits
    end

    def validate
      validate_x_y_basis
      validate_bell_basis
    end

    private

    attr_reader :basis, :qubits

    def validate_x_y_basis
      return unless %w[x y].include?(basis) && qubits != 1

      raise Simulator::Error, "symbolic #{basis}-basis run currently supports only 1-qubit circuits"
    end

    def validate_bell_basis
      return unless basis == 'bell' && qubits != 2

      raise Simulator::Error, 'symbolic bell-basis run currently supports only 2-qubit circuits'
    end
  end
end
