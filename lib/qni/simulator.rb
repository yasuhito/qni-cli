# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'angled_gates'
require_relative 'circuit'
require_relative 'h_gate'
require_relative 'initial_state'
require_relative 's_dagger_gate'
require_relative 'swap_gate'
require_relative 'simulator/step_operation'
require_relative 'sqrt_x_gate'
require_relative 'state_vector'
require_relative 'symbolic_state_renderer'
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

    FIXED_GATE_OPERATORS = {
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

    def render_symbolic_state_vector(basis: nil)
      SymbolicStateRenderer.new(data, basis:).render
    end

    def render_expectation_values(pauli_strings)
      current_state_vector = state_vector

      pauli_strings.map do |pauli_string|
        "#{pauli_string}=#{StateVector.format_amplitude(current_state_vector.expectation(pauli_string))}"
      end.join("\n")
    rescue PauliString::Error => e
      raise Error, e.message
    end

    def final_state_vector
      state_vector
    end

    private

    attr_reader :data

    def state_vector
      cols.reduce(starting_state_vector) do |current_state_vector, col|
        apply_col(current_state_vector, col)
      end
    rescue AngleExpression::Error, InitialState::Error => e
      raise Error, e.message
    end

    def qubits
      data.fetch('qubits')
    end

    def cols
      data.fetch('cols')
    end

    def starting_state_vector
      initial_state = data['initial_state']
      return StateVector.zero(qubits) unless initial_state

      StateVector.new(
        qubits:,
        amplitudes: InitialState.from_h(initial_state).resolve_numeric(variables)
      )
    end

    def apply_col(state_vector, col)
      StepOperation.new(col:, gate_operator_for: method(:gate_operator_for)).apply(state_vector)
    end

    def gate_operator_for(gate)
      return FIXED_GATE_OPERATORS.fetch(gate) if FIXED_GATE_OPERATORS.key?(gate)

      angled_gate_operator_for(gate)
    rescue AngleExpression::Error => e
      raise Error, e.message
    end

    def angled_gate_operator_for(gate)
      parsed_gate = AngledGates.parse(gate, variables:)
      return parsed_gate if parsed_gate

      raise Error, "unsupported gate for run: #{gate.inspect}"
    end

    def variables
      data.fetch('variables', {})
    end
  end
end
