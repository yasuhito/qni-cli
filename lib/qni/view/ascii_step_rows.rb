# frozen_string_literal: true

module Qni
  module View
    # Splits the three visible wire rows of a 1-qubit ASCII circuit into fixed-width cells.
    class AsciiStepRows
      def initialize(top_wire:, mid_wire:, bottom_wire:, cell_width:)
        @top_wire = top_wire
        @mid_wire = mid_wire
        @bottom_wire = bottom_wire
        @cell_width = cell_width
      end

      def whole_cells?
        wires.all? { |wire| wire && (wire.length % cell_width).zero? }
      end

      def uniform_cell_count?
        counts = [top_cells.length, mid_cells.length, bottom_cells.length]
        counts.uniq.one?
      end

      def cells
        top_cells.zip(mid_cells, bottom_cells).map do |top_cell, mid_cell, bottom_cell|
          AsciiStepCell.new(top_cell:, mid_cell:, bottom_cell:)
        end
      end

      def cell_count
        mid_cells.length
      end

      private

      attr_reader :bottom_wire, :cell_width, :mid_wire, :top_wire

      def wires
        @wires ||= [top_wire, mid_wire, bottom_wire]
      end

      def top_cells
        @top_cells ||= split(top_wire)
      end

      def mid_cells
        @mid_cells ||= split(mid_wire)
      end

      def bottom_cells
        @bottom_cells ||= split(bottom_wire)
      end

      def split(wire)
        wire.scan(/.{#{cell_width}}/)
      end
    end
  end
end
