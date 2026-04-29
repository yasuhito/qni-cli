# frozen_string_literal: true

module Qni
  # Thor command registration and executor for qni gate.
  class CLI < Thor
    desc 'gate --qubit=N --step=N', 'Show the gate at a circuit slot'
    method_option :step, type: :string, required: true, desc: '0-based step index'
    method_option :qubit, type: :string, required: true, desc: '0-based qubit index'
    def gate
      output = GateCommand.new(
        circuit_file: current_circuit_file,
        gate_options: AddCommandOptions.new(options)
      ).execute
      write_output(output)
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    # Executes qni gate against a loaded circuit file.
    class GateCommand
      def initialize(circuit_file:, gate_options:)
        @circuit_file = circuit_file
        @gate_options = gate_options
      end

      def execute
        cell_at(gate_options.step, gate_options.qubit)
      end

      private

      attr_reader :circuit_file, :gate_options

      def cell_at(step, qubit)
        circuit_file.load.to_h.fetch('cols').fetch(step).fetch(qubit)
      rescue IndexError
        raise Thor::Error, "slot does not exist: cols[#{step}][#{qubit}]"
      end
    end
  end
end
