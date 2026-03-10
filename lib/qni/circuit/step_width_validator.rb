# frozen_string_literal: true

module Qni
  class Circuit
    # Verifies that raw columns and Step objects all match the circuit width.
    class StepWidthValidator
      def initialize(width)
        @width = width
      end

      def validate_raw_cols(cols)
        raise Error, 'cols must be an array' unless cols.is_a?(Array)
        return if cols.all? { |col| col.is_a?(Array) && col.length == width }

        raise Error, 'each column in cols must have exactly qubits entries'
      end

      def validate_steps(steps)
        raise Error, 'cols must be an array' unless steps.is_a?(Array)
        return if steps.all? { |step| step.is_a?(Step) && step.width == width }

        raise Error, 'each column in cols must have exactly qubits entries'
      end

      private

      attr_reader :width
    end
  end
end
