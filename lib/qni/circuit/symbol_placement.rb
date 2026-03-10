# frozen_string_literal: true

module Qni
  class Circuit
    # Represents all symbol writes to be applied to a single step.
    class SymbolPlacement
      def initialize(step:, symbols:)
        @step = step
        @symbols = symbols.dup
      end

      attr_reader :step

      def each_position
        symbols.each_key do |qubit|
          yield SlotPosition.new(step:, qubit:)
        end
      end

      def each_write
        symbols.each do |qubit, symbol|
          yield SlotPosition.new(step:, qubit:), symbol
        end
      end

      def ensure_available_in(steps)
        each_position do |position|
          next if position.available_in?(steps)

          raise Error, position.occupied_error_message(steps)
        end
      end

      def place_on(steps)
        each_write do |position, symbol|
          position.place_on(steps, symbol)
        end
      end

      def max_qubit
        symbols.keys.max
      end

      private

      attr_reader :symbols
    end
  end
end
