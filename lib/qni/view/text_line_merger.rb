# frozen_string_literal: true

module Qni
  module View
    # Merges overlapping text-rendered wire lines with top or bottom priority.
    class TextLineMerger
      # Represents one pair of overlapping lines to be merged.
      LinePair = Struct.new(:top_line, :bottom_line) do
        def merge_with(intersection_merges)
          top_line.chars.zip(bottom_line.chars).map do |top_char, bottom_char|
            next top_char if top_char == bottom_char
            next bottom_char if top_char == ' '

            yield(top_char, bottom_char) ||
              intersection_merges[[top_char, bottom_char]] ||
              bottom_char
          end.join
        end
      end
      INTERSECTION_MERGES = {
        ['┬', '═'] => '╪',
        ['│', '═'] => '╪',
        ['┬', '─'] => '┼',
        ['│', '─'] => '┼',
        ['║', '═'] => '╬',
        ['╥', '═'] => '╬',
        ['║', '─'] => '╫',
        ['╥', '─'] => '╫'
      }.freeze
      TOP_CORNER_MERGES = {
        ['└', '┌'] => '├',
        ['┘', '┐'] => '┤'
      }.freeze

      def initialize(intersection_merges: INTERSECTION_MERGES, top_corner_merges: TOP_CORNER_MERGES)
        @intersection_merges = intersection_merges
        @top_corner_merges = top_corner_merges
        @blank_bottom_vertical_chars = ['│', '┼', '╪'].freeze
        @blank_bottom_double_vertical_chars = ['║', '╫', '╬'].freeze
      end

      def merge_bottom(top_line, bottom_line)
        merge(LinePair.new(top_line, bottom_line)) do |top_char, bottom_char|
          merge_blank_bottom_with_bottom_priority(top_char) if bottom_char == ' '
        end
      end

      def merge_top(top_line, bottom_line)
        merge(LinePair.new(top_line, bottom_line)) do |top_char, bottom_char|
          merge_top_priority(top_char, bottom_char) ||
            (merge_blank_bottom_with_top_priority(top_char) if bottom_char == ' ')
        end
      end

      private

      attr_reader :blank_bottom_double_vertical_chars, :blank_bottom_vertical_chars,
                  :intersection_merges, :top_corner_merges

      # rubocop:disable Naming/BlockForwarding, Style/ArgumentsForwarding
      def merge(line_pair, &block)
        line_pair.merge_with(intersection_merges, &block)
      end
      # rubocop:enable Naming/BlockForwarding, Style/ArgumentsForwarding

      def merge_top_priority(top_char, bottom_char)
        return top_char if ['┬', '╥'].include?(top_char) && ['║', '│'].include?(bottom_char)
        return top_corner_merges[[top_char, bottom_char]] if top_corner_merges.key?([top_char, bottom_char])
        return '┬' if ['┐', '┌'].include?(bottom_char)

        '┴' if ['┘', '└'].include?(top_char) && bottom_char == '─'
      end

      def merge_blank_bottom_with_bottom_priority(top_char)
        return '│' if ['│', '┼', '╪', '┬'].include?(top_char)
        return '║' if top_char == '╥'

        merge_blank_bottom_common(top_char) || ' '
      end

      def merge_blank_bottom_with_top_priority(top_char)
        merge_blank_bottom_common(top_char) || top_char
      end

      def merge_blank_bottom_common(top_char)
        return '│' if blank_bottom_vertical_chars.include?(top_char)
        return '║' if blank_bottom_double_vertical_chars.include?(top_char)

        nil
      end
    end
  end
end
