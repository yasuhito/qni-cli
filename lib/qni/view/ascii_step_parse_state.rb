# frozen_string_literal: true

require_relative '../circuit'
require_relative '../swap_gate'

module Qni
  module View
    # Holds parse-time slots and shape markers for one ASCII step.
    class AsciiStepParseState
      # Records which control/target/swap markers appeared in one step.
      StepShape = Struct.new(:controls, :gate_targets, :swap_targets) do
        def initialize
          super([], [], [])
        end

        def valid?
          no_special_markers? || swap_step? || controlled_gate_step?
        end

        private

        def controlled_gate_step?
          controls.any? && gate_targets.one? && swap_targets.empty?
        end

        def no_special_markers?
          controls.empty? && swap_targets.empty?
        end

        def swap_step?
          swap_targets.length == 2 && controls.empty? && gate_targets.empty?
        end
      end

      def initialize(qubit_count, error_class:)
        @error_class = error_class
        @shape = StepShape.new
        @slots = Array.new(qubit_count, 1)
      end

      def finish
        validate_shape
        @slots
      end

      def mark(qubit, action)
        return mark_control(qubit) if action == :control
        return mark_swap(qubit) if action == :swap

        mark_gate(qubit, action)
      end

      private

      def mark_control(qubit)
        @slots[qubit] = Circuit::CONTROL_SYMBOL
        @shape.controls << qubit
      end

      def mark_gate(qubit, gate_symbol)
        @slots[qubit] = gate_symbol
        @shape.gate_targets << qubit
      end

      def mark_swap(qubit)
        @slots[qubit] = SwapGate::SYMBOL
        @shape.swap_targets << qubit
      end

      def validate_shape
        return if @shape.valid?

        raise @error_class, 'ASCII parser currently supports one target gate or one swap per step'
      end
    end
  end
end
