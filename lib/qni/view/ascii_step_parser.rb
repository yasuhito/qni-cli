# frozen_string_literal: true

require_relative '../angled_gates'
require_relative '../circuit'
require_relative '../sqrt_x_gate'
require_relative '../swap_gate'

module Qni
  module View
    # Parses one ASCII step spanning one or more qubits into circuit slots.
    class AsciiStepParser
      BOX_PATTERN = /\A┤(?<label>.+)├\z/
      CONTROL_PATTERN = /\A─*■─*\z/
      EMPTY_PATTERN = /\A─+\z/
      FIXED_GATE_LABELS = {
        'H' => 'H',
        'S' => 'S',
        'S†' => 'S†',
        'T' => 'T',
        'T†' => 'T†',
        'X' => 'X',
        'Y' => 'Y',
        'Z' => 'Z',
        SqrtXGate::VIEW_SYMBOL => SqrtXGate::SYMBOL
      }.freeze
      SWAP_PATTERN = /\A─*X─*\z/
      VERTICAL_BRIDGE_PATTERN = /\A─*│─*\z/

      # Tracks which special markers appeared in a parsed step.
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

      def initialize(step_slices, error_class:)
        @step_slices = step_slices
        @error_class = error_class
      end

      def to_slots
        @shape = StepShape.new
        @slots = Array.new(step_slices.length, 1)
        step_slices.each_with_index do |step_slice, qubit|
          apply_mid_cell(step_slice.fetch(:mid), qubit)
        end
        validate_shape(shape)
        slots
      ensure
        @shape = nil
        @slots = nil
      end

      private

      attr_reader :error_class, :shape, :slots, :step_slices

      def apply_mid_cell(mid_cell, qubit)
        gate_symbol = gate_symbol_for(mid_cell)
        return mark_gate(gate_symbol, qubit) if gate_symbol
        return mark_control(qubit) if control_mid?(mid_cell)
        return mark_swap(qubit) if swap_mid?(mid_cell)
        return if empty_mid?(mid_cell) || vertical_bridge_mid?(mid_cell)

        raise error_class, 'ASCII parser currently supports boxed fixed gates and empty wires only'
      end

      def mark_control(qubit)
        slots[qubit] = Circuit::CONTROL_SYMBOL
        shape.controls << qubit
      end

      def mark_gate(gate_symbol, qubit)
        slots[qubit] = gate_symbol
        shape.gate_targets << qubit
      end

      def mark_swap(qubit)
        slots[qubit] = SwapGate::SYMBOL
        shape.swap_targets << qubit
      end

      def validate_shape(shape)
        return if shape.valid?

        raise error_class, 'ASCII parser currently supports one target gate or one swap per step'
      end

      def gate_symbol_for(mid_cell)
        label = BOX_PATTERN.match(mid_cell)&.[](:label)&.strip
        return unless label

        FIXED_GATE_LABELS.fetch(label) do
          parsed_gate = AngledGates.parse(label)
          return parsed_gate.serialized if parsed_gate

          raise error_class, "unsupported ASCII gate label: #{label.inspect}"
        end
      end

      def control_mid?(mid_cell)
        CONTROL_PATTERN.match?(mid_cell)
      end

      def empty_mid?(mid_cell)
        EMPTY_PATTERN.match?(mid_cell)
      end

      def swap_mid?(mid_cell)
        SWAP_PATTERN.match?(mid_cell)
      end

      def vertical_bridge_mid?(mid_cell)
        VERTICAL_BRIDGE_PATTERN.match?(mid_cell)
      end
    end
  end
end
