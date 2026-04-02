# frozen_string_literal: true

require_relative 'ascii_gate_symbol_resolver'
require_relative 'ascii_step_mid_cell'
require_relative 'ascii_step_parse_state'

module Qni
  module View
    # Parses one ASCII step spanning one or more qubits into circuit slots.
    class AsciiStepParser
      def initialize(step_slices, error_class:)
        @step_slices = step_slices
        @error_class = error_class
        @resolver = AsciiGateSymbolResolver.new(error_class:)
      end

      def to_slots
        state = AsciiStepParseState.new(@step_slices.length, error_class: @error_class)
        fill_slots(state)
        state.finish
      end

      private

      def fill_slots(state)
        @step_slices.each_with_index do |step_slice, qubit|
          apply_mid_cell(step_slice, qubit, state)
        end
      end

      def apply_mid_cell(step_slice, qubit, state)
        action = slot_action_for(step_slice)
        return if action == :empty

        state.mark(qubit, action)
      end

      def slot_action_for(step_slice)
        gate_symbol = @resolver.resolve(step_slice)
        return gate_symbol if gate_symbol

        action = AsciiStepMidCell.new(step_slice.fetch(:mid)).slot_action
        return action unless action == :unsupported

        raise @error_class, 'ASCII parser currently supports boxed fixed gates and empty wires only'
      end
    end
  end
end
