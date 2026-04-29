# frozen_string_literal: true

require_relative '../circuit'
require_relative '../swap_gate'
require_relative 'qcircuit_gate_label'

module Qni
  module Export
    # Renders one serialized qni column as per-qubit qcircuit cells.
    class QCircuitColumn
      CONTROL_SYMBOL = Circuit::CONTROL_SYMBOL
      SWAP_SYMBOL = SwapGate::SYMBOL
      DIRECT_SLOT_RENDERERS = {
        nil => '\\qw',
        '' => '\\qw',
        1 => '\\qw'
      }.freeze
      TARGET_SLOT_RENDERERS = {
        'X' => '\\targ'
      }.freeze

      # Represents the single non-control gate in a controlled step.
      class ControlledTarget
        attr_reader :qubit

        def initialize(slot, qubit)
          @slot = slot
          @qubit = qubit
        end

        def control_cell_for(control_qubit)
          "\\ctrl{#{qubit - control_qubit}}"
        end

        def rendered_cell
          TARGET_SLOT_RENDERERS.fetch(@slot) { QCircuitGateLabel.new(@slot).gate_cell }
        end
      end

      def initialize(slots)
        @slots = slots
      end

      def render_for(qubit)
        rendered_cells.fetch(qubit, '\\qw')
      end

      private

      attr_reader :slots

      def rendered_cells
        @rendered_cells ||= if swap_step?
                              swap_cells
                            elsif controlled_step?
                              controlled_cells
                            else
                              simple_cells
                            end
      end

      def swap_step?
        slots.include?(SWAP_SYMBOL)
      end

      def controlled_step?
        slots.include?(CONTROL_SYMBOL)
      end

      def swap_cells
        raise "unsupported swap step: #{slots.inspect}" unless valid_swap_step?

        top_qubit, bottom_qubit = swap_qubits.minmax
        {
          top_qubit => '\\qswap',
          bottom_qubit => "\\qswap \\qwx[#{top_qubit - bottom_qubit}]"
        }
      end

      def valid_swap_step?
        swap_qubits.length == 2 && slots.all? { |slot| [nil, '', 1, SWAP_SYMBOL].include?(slot) }
      end

      def swap_qubits
        @swap_qubits ||= slots.each_index.select { |index| slots.fetch(index) == SWAP_SYMBOL }
      end

      def controlled_cells
        target = controlled_target
        control_cells_for(target).merge(target.qubit => target.rendered_cell)
      end

      def control_cells_for(target)
        control_qubits.to_h do |control_qubit|
          [control_qubit, target.control_cell_for(control_qubit)]
        end
      end

      def control_qubits
        @control_qubits ||= slots.each_index.select { |index| slots.fetch(index) == CONTROL_SYMBOL }
      end

      def controlled_target
        targets = slots.each_with_index.filter_map do |slot, index|
          ControlledTarget.new(slot, index) unless [nil, '', 1, CONTROL_SYMBOL].include?(slot)
        end
        raise "unsupported controlled step: #{slots.inspect}" unless targets.one?

        targets.first
      end

      def simple_cells
        slots.each_with_object({}).with_index do |(slot, cells), qubit|
          cells[qubit] = DIRECT_SLOT_RENDERERS.fetch(slot) { QCircuitGateLabel.new(slot).gate_cell }
        end
      end
    end
  end
end
