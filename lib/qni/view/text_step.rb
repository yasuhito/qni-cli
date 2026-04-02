# frozen_string_literal: true

require_relative '../swap_gate'
require_relative 'text_gate_cell'

module Qni
  module View
    # Interprets one serialized qni step for text rendering.
    class TextStep
      CONTROL_SYMBOL = '•'
      SWAP_SYMBOL = SwapGate::SYMBOL
      NON_GATE_SLOTS = [1, CONTROL_SYMBOL, SWAP_SYMBOL].freeze

      # Describes a gate slot placed on a specific qubit within one step.
      class GatePlacement
        attr_reader :qubit

        def initialize(slot, qubit)
          @slot = slot
          @qubit = qubit
        end

        def cell(top_connect: '─', bot_connect: '─')
          TextGateCell.new(@slot, top_connect:, bot_connect:).build
        end

        def empty_wire_on?(layer)
          layer.empty_wire_at?(qubit)
        end

        def place_on(layer, top_connect: '─', bot_connect: '─')
          layer.place(qubit, cell(top_connect:, bot_connect:))
        end

        def place_on_if_empty(layer)
          place_on(layer) if empty_wire_on?(layer)
        end
      end

      def initialize(raw_step)
        @raw_step = raw_step
      end

      def swap_pair
        return unless swap_qubits.length == 2

        swap_qubits.minmax
      end

      def control_qubits
        @control_qubits ||= raw_step.each_index.select do |index|
          raw_step.fetch(index) == CONTROL_SYMBOL
        end
      end

      def controlled_target
        return unless control_qubits.any? && targeted_gates.one?

        targeted_gates.first
      end

      def single_gates
        @single_gates ||= raw_step.each_with_index.filter_map do |slot, qubit|
          GatePlacement.new(slot, qubit) unless NON_GATE_SLOTS.include?(slot)
        end
      end

      def place_single_gates_on(layer)
        single_gates.each { |placement| placement.place_on_if_empty(layer) }
      end

      def empty_slot?(qubit)
        raw_step.fetch(qubit) == 1
      end

      private

      attr_reader :raw_step

      def swap_qubits
        @swap_qubits ||= raw_step.each_index.select do |index|
          raw_step.fetch(index) == SWAP_SYMBOL
        end
      end

      def targeted_gates
        @targeted_gates ||= raw_step.each_with_index.filter_map do |slot, qubit|
          GatePlacement.new(slot, qubit) unless NON_GATE_SLOTS.include?(slot)
        end
      end
    end
  end
end
