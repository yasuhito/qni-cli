# frozen_string_literal: true

module Qni
  class Circuit
    # Trims leading empty steps and qubits while preserving at least one of each.
    class LayoutNormalizer
      def initialize(steps:, qubits:, qubit_trim: :leading, minimum_qubits: 1)
        @steps = steps
        @qubits = qubits
        @qubit_trim = qubit_trim
        @minimum_qubits = minimum_qubits
      end

      def normalize
        trim_leading_empty_steps
        trim_leading_empty_qubits
        trim_trailing_empty_qubits
        qubits
      end

      private

      attr_reader :minimum_qubits, :qubits, :steps

      def trim_leading_empty_steps
        steps.shift while steps.length > 1 && steps.first.empty?
      end

      def trim_leading_empty_qubits
        count = leading_empty_qubits_count
        return if count.zero?

        steps.each { |step| step.drop_left(count) }
        @qubits -= count
      end

      def trim_trailing_empty_qubits
        return unless trim_trailing_qubits?

        trailing_empty_qubits_count.then { |count| drop_trailing_empty_qubits(count) unless count.zero? }
      end

      def drop_trailing_empty_qubits(count)
        steps.each { |step| step.drop_right(count) }
        @qubits -= count
      end

      def leading_empty_qubits_count
        count = 0
        count += 1 while removable_leading_qubit?(count)
        count
      end

      def trailing_empty_qubits_count
        count = 0
        count += 1 while removable_trailing_qubit?(count)
        count
      end

      def removable_leading_qubit?(qubit)
        qubit < removable_qubits_limit && steps.all? { |step| step.empty_at?(qubit) }
      end

      def removable_trailing_qubit?(offset)
        offset < removable_qubits_limit && steps.all? { |step| step.empty_at?(qubits - offset - 1) }
      end

      def removable_qubits_limit
        qubits - minimum_qubits
      end

      def trim_trailing_qubits?
        @qubit_trim == :both
      end
    end
  end
end
