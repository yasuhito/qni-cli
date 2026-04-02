# frozen_string_literal: true

module Qni
  module View
    # Classifies the middle wire cell inside one ASCII step slice.
    class AsciiStepMidCell
      BOX_PATTERN = /\A┤(?<label>.+)├\z/
      CONTROL_PATTERN = /\A─*■─*\z/
      EMPTY_PATTERN = /\A─+\z/
      SWAP_PATTERN = /\A─*X─*\z/
      VERTICAL_BRIDGE_PATTERN = /\A─*│─*\z/

      def initialize(mid_cell)
        @mid_cell = mid_cell
      end

      def gate_label
        BOX_PATTERN.match(@mid_cell)&.[](:label)&.strip
      end

      def control?
        CONTROL_PATTERN.match?(@mid_cell)
      end

      def empty?
        EMPTY_PATTERN.match?(@mid_cell)
      end

      def swap?
        SWAP_PATTERN.match?(@mid_cell)
      end

      def vertical_bridge?
        VERTICAL_BRIDGE_PATTERN.match?(@mid_cell)
      end

      def slot_action
        return :control if control?
        return :swap if swap?
        return :empty if empty? || vertical_bridge?

        :unsupported
      end
    end
  end
end
