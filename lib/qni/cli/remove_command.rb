# frozen_string_literal: true

module Qni
  # Thor command registration and executor for qni rm.
  class CLI < Thor
    desc 'rm --qubit=N --step=N', 'Remove a gate from the circuit'
    method_option :step, type: :string, required: true, desc: '0-based step index'
    method_option :qubit, type: :string, required: true, desc: '0-based qubit index'
    def rm
      RemoveCommand.new(
        circuit_file: current_circuit_file,
        remove_options: AddCommandOptions.new(options)
      ).execute
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    # Executes qni rm against a loaded circuit file.
    class RemoveCommand
      def initialize(circuit_file:, remove_options:)
        @circuit_file = circuit_file
        @remove_options = remove_options
      end

      def execute
        circuit_file.update_required_circuit do |circuit|
          circuit.remove_gate(step: remove_options.step, qubit: remove_options.qubit)
        end
      end

      private

      attr_reader :circuit_file, :remove_options
    end
  end
end
