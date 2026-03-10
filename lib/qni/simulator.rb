# frozen_string_literal: true

require_relative 'circuit'
require_relative 'h_gate'
require_relative 'swap_gate'
require_relative 'simulator/step_operation'
require_relative 'state_vector'
require_relative 'x_gate'
require_relative 'y_gate'
require_relative 'z_gate'
require_relative 's_gate'
require_relative 't_gate'

module Qni
  # Executes a circuit and produces a rendered state vector.
  class Simulator
    # Raised when simulation encounters unsupported circuit content.
    class Error < StandardError; end

    GATE_CLASSES = {
      HGate::SYMBOL => HGate,
      SGate::SYMBOL => SGate,
      TGate::SYMBOL => TGate,
      XGate::SYMBOL => XGate,
      YGate::SYMBOL => YGate,
      ZGate::SYMBOL => ZGate
    }.freeze

    def initialize(circuit)
      @data = circuit.to_h
    end

    def render_state_vector
      state_vector.to_csv
    end

    private

    attr_reader :data

    def state_vector
      cols.reduce(StateVector.zero(qubits)) do |current_state_vector, col|
        apply_col(current_state_vector, col)
      end
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
      GATE_CLASSES.fetch(gate)
    rescue KeyError
      raise Error, "unsupported gate for run: #{gate.inspect}"
    end
  end
end
