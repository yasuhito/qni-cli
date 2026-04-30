# frozen_string_literal: true

module Qni
  class Circuit
    # Removes the complete operation represented by a selected circuit slot.
    class OperationRemoval
      def initialize(steps:, step:, qubit:)
        @steps = steps
        @step = step
        @qubit = qubit
      end

      def apply
        raise Error, "slot is empty: cols[#{step}][#{qubit}]" if selected_slot == 1

        removable_qubits.each { |target_qubit| selected_step.clear_gate(target_qubit) }
      end

      private

      attr_reader :qubit, :step, :steps

      def removable_qubits
        return swap_qubits if selected_slot == SwapGate::SYMBOL
        return controlled_qubits if controlled_slot?

        [qubit]
      end

      def controlled_slot?
        slots.include?(CONTROL_SYMBOL) && (selected_slot == CONTROL_SYMBOL || target_qubits.include?(qubit))
      end

      def controlled_qubits
        raise Error, "unsupported controlled step: cols[#{step}] = #{slots.inspect}" unless target_qubits.one?

        control_qubits + target_qubits
      end

      def swap_qubits
        raise Error, "unsupported swap step: cols[#{step}] = #{slots.inspect}" unless swap_slot_qubits.length == 2

        swap_slot_qubits
      end

      def control_qubits
        @control_qubits ||= slot_indices(CONTROL_SYMBOL)
      end

      def target_qubits
        @target_qubits ||= slots.each_index.reject do |slot_qubit|
          [1, CONTROL_SYMBOL].include?(slots.fetch(slot_qubit))
        end
      end

      def swap_slot_qubits
        @swap_slot_qubits ||= slot_indices(SwapGate::SYMBOL)
      end

      def slot_indices(symbol)
        slots.each_index.select { |slot_qubit| slots.fetch(slot_qubit) == symbol }
      end

      def selected_slot
        @selected_slot ||= selected_step.fetch(qubit)
      rescue IndexError
        raise Error, "slot does not exist: cols[#{step}][#{qubit}]"
      end

      def selected_step
        @selected_step ||= steps.fetch(step)
      rescue IndexError
        raise Error, "slot does not exist: cols[#{step}][#{qubit}]"
      end

      def slots
        @slots ||= selected_step.to_a
      end
    end
  end
end
