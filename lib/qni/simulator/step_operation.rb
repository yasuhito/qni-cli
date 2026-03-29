# frozen_string_literal: true

module Qni
  class Simulator
    # Describes and applies one serialized circuit column to a state vector.
    class StepOperation
      CONTROL_SYMBOL = Circuit::CONTROL_SYMBOL
      SWAP_SYMBOL = SwapGate::SYMBOL

      def initialize(col:, gate_operator_for:)
        @col = col
        @gate_operator_for = gate_operator_for
      end

      def apply(state_vector)
        return apply_swap(state_vector) if swap?
        return apply_controlled(state_vector) if controlled?

        apply_uncontrolled(state_vector)
      end

      private

      attr_reader :col, :gate_operator_for

      def apply_swap(state_vector)
        raise Error, "unsupported swap step: #{col.inspect}" unless valid_swap_step?

        state_vector.apply_swap(*swap_qubits)
      end

      def apply_controlled(state_vector)
        state_vector.apply_controlled_single_qubit_gate(
          control_qubits,
          target_qubit,
          gate_operator
        )
      end

      def apply_uncontrolled(state_vector)
        col.each_with_index.reduce(state_vector) do |current, (gate, qubit)|
          apply_gate(current, gate, qubit)
        end
      end

      def apply_gate(state_vector, gate, qubit)
        return state_vector if gate == 1

        state_vector.apply_single_qubit_gate(qubit, gate_operator_for.call(gate))
      end

      def swap?
        col.include?(SWAP_SYMBOL)
      end

      def controlled?
        col.include?(CONTROL_SYMBOL)
      end

      def control_qubits
        @control_qubits ||= col.each_index.select { |qubit| col.fetch(qubit) == CONTROL_SYMBOL }
      end

      def gate_operator
        gate_operator_for.call(target_gate)
      end

      def target_gate
        target.fetch(0)
      end

      def target_qubit
        target.fetch(1)
      end

      def target
        @target ||= begin
          targets = col.each_with_index.filter_map do |gate, qubit|
            [gate, qubit] unless [1, CONTROL_SYMBOL].include?(gate)
          end
          raise Error, "unsupported controlled step: #{col.inspect}" unless targets.one?

          targets.first
        end
      end

      def swap_qubits
        @swap_qubits ||= col.each_index.select { |qubit| col.fetch(qubit) == SWAP_SYMBOL }
      end

      def valid_swap_step?
        swap_qubits.length == 2 && col.all? { |slot| [1, SWAP_SYMBOL].include?(slot) }
      end
    end
  end
end
