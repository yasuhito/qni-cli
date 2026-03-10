# frozen_string_literal: true

module Qni
  class Circuit
    # Trims leading empty steps and qubits while preserving at least one of each.
    class LayoutNormalizer
      def initialize(steps:, qubits:)
        @steps = steps
        @qubits = qubits
      end

      def normalize
        trim_leading_empty_steps
        trim_leading_empty_qubits
        qubits
      end

      private

      attr_reader :qubits, :steps

      def trim_leading_empty_steps
        steps.shift while steps.length > 1 && steps.first.empty?
      end

      def trim_leading_empty_qubits
        count = leading_empty_qubits_count
        return if count.zero?

        steps.each { |step| step.drop_left(count) }
        @qubits -= count
      end

      def leading_empty_qubits_count
        count = 0
        count += 1 while removable_leading_qubit?(count)
        count
      end

      def removable_leading_qubit?(qubit)
        qubit < qubits - 1 && steps.all? { |step| step.empty_at?(qubit) }
      end
    end
  end
end
