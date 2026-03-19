# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'angled_gates'
require_relative 'circuit'
require_relative 'h_gate'
require_relative 's_dagger_gate'
require_relative 'swap_gate'
require_relative 'simulator/step_operation'
require_relative 'sqrt_x_gate'
require_relative 'state_vector'
require_relative 'x_gate'
require_relative 'y_gate'
require_relative 'z_gate'
require_relative 's_gate'
require_relative 't_gate'
require_relative 't_dagger_gate'

module Qni
  # Executes a circuit and produces a rendered state vector.
  class Simulator
    # Raised when simulation encounters unsupported circuit content.
    class Error < StandardError; end

    GATE_CLASSES = {
      HGate::SYMBOL => HGate,
      SGate::SYMBOL => SGate,
      SDaggerGate::SYMBOL => SDaggerGate,
      TGate::SYMBOL => TGate,
      TDaggerGate::SYMBOL => TDaggerGate,
      XGate::SYMBOL => XGate,
      SqrtXGate::SYMBOL => SqrtXGate,
      YGate::SYMBOL => YGate,
      ZGate::SYMBOL => ZGate
    }.freeze

    def initialize(circuit)
      @data = circuit.to_h
    end

    def render_state_vector
      state_vector.to_csv
    end

    def render_expectation_values(pauli_strings)
      current_state_vector = state_vector

      pauli_strings.map do |pauli_string|
        "#{pauli_string}=#{StateVector.format_amplitude(current_state_vector.expectation(pauli_string))}"
      end.join("\n")
    rescue PauliString::Error => e
      raise Error, e.message
    end

    private

    attr_reader :data

    def state_vector
      cols.reduce(StateVector.zero(qubits)) do |current_state_vector, col|
        apply_col(current_state_vector, col)
      end
    rescue AngleExpression::Error => e
      raise Error, e.message
    end

    def qubits
      data.fetch('qubits')
    end

    def cols
      data.fetch('cols')
    end

    def apply_col(state_vector, col)
      StepOperation.new(col:, gate_class_for: method(:gate_class_for)).apply(state_vector)
    end

    def gate_class_for(gate)
      return GATE_CLASSES.fetch(gate) if GATE_CLASSES.key?(gate)

      phase_gate_for(gate)
    rescue AngleExpression::Error => e
      raise Error, e.message
    end

    def phase_gate_for(gate)
      parsed_gate = AngledGates.parse(gate, variables:)
      return parsed_gate if parsed_gate

      raise Error, "unsupported gate for run: #{gate.inspect}"
    end

    def variables
      data.fetch('variables', {})
    end
  end
end
