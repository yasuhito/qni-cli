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

      def available_in?(steps)
        slot_in(steps) == 1
      end

      def occupied_error_message(steps)
        "target slot is occupied: cols[#{step}][#{qubit}] = #{slot_in(steps).inspect}"
      end

      def place_on(steps, symbol)
        steps.fetch(step).place_gate(qubit, symbol)
      end

      private

      def slot_in(steps)
        steps.fetch(step).fetch(qubit)
      end
    end
  end
end
