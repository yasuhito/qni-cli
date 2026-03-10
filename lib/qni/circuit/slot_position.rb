# frozen_string_literal: true

module Qni
  class Circuit
    # Immutable step/qubit coordinate used while preparing and validating slot updates.
    class SlotPosition
      def initialize(step:, qubit:)
        @step = step
        @qubit = qubit
      end

      attr_reader :qubit, :step
    end
  end
end
