# frozen_string_literal: true

require_relative '../swap_gate'

module Qni
  class CLI < Thor
    # Executes qni add against a circuit file.
    class AddCommand
      def initialize(circuit_file:, gate:, add_options:)
        @circuit_file = circuit_file
        @gate = gate
        @add_options = add_options
      end

      def execute
        return add_swap_gate if swap_gate?
        return add_controlled_gate if add_options.controlled?

        circuit_file.add_gate(gate:, step: add_options.step, qubit: add_options.qubit)
      end

      private

      attr_reader :add_options, :circuit_file, :gate

      def add_swap_gate
        raise Thor::Error, 'SWAP does not support --control yet' if add_options.controlled?

        circuit_file.add_swap_gate(step: add_options.step, targets: add_options.swap_targets)
      end

      def add_controlled_gate
        circuit_file.add_controlled_gate(
          step: add_options.step,
          controlled_gate: Circuit::ControlledGate.new(
            gate:,
            controls: add_options.controls,
            target: add_options.qubit
          )
        )
      end

      def swap_gate?
        gate == SwapGate::SYMBOL
      end
    end
  end
end
