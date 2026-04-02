# frozen_string_literal: true

module Qni
  module View
    # Builds the four rendered lines for one qubit across all step layers.
    class TextWireLines
      # Stores the shared framing strings for one rendered wire.
      WireFrame = Struct.new(:label, :label_width, :prefix)

      def initialize(layers, qubit, wire_label:, wire_label_width:, wire_prefix:)
        @layers = layers
        @qubit = qubit
        @wire_frame = WireFrame.new(wire_label, wire_label_width, wire_prefix)
      end

      def to_a
        [
          framed_line(:annotation),
          framed_line(:top),
          labeled_mid_line,
          framed_line(:bot)
        ]
      end

      private

      attr_reader :layers, :qubit, :wire_frame

      def cells
        @cells ||= layers.map { |layer| layer.fetch(qubit) }
      end

      def framed_line(part)
        wire_frame.prefix + rendered_row(part)
      end

      def labeled_mid_line
        wire_frame.label.rjust(wire_frame.label_width) + rendered_row(:mid)
      end

      def rendered_row(part)
        cells.map { |cell| cell.public_send(part) }.join
      end
    end
  end
end
