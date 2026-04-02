# frozen_string_literal: true

module Qni
  module View
    # Accumulates rendered wire lines and merges overlaps between adjacent wires.
    class TextWireCanvas
      # Returns the current line set with empty top/bottom padding removed.
      class TrimmedLines
        def initialize(lines)
          @lines = lines
          @blank_pattern = /\A\s*\z/
        end

        def to_a
          leading_trimmed_lines.reverse.drop_while { |line| blank?(line) }.reverse
        end

        private

        attr_reader :blank_pattern, :lines

        def leading_trimmed_lines
          lines.drop_while { |line| blank?(line) }
        end

        def blank?(line)
          blank_pattern.match?(line)
        end
      end

      def initialize(line_merger)
        @line_merger = line_merger
        @lines = []
        @previous_bottom = nil
      end

      def append(wire_lines)
        annotation_line, top_line, mid_line, bottom_line = wire_lines
        merged_top = merged_top_line(top_line)
        append_annotation_line(annotation_line)
        append_body_lines(merged_top, mid_line, bottom_line)
        @previous_bottom = bottom_line
      end

      def to_a
        TrimmedLines.new(lines).to_a
      end

      private

      attr_reader :line_merger, :lines, :previous_bottom

      def append_annotation_line(annotation_line)
        lines << annotation_line unless annotation_line.strip.empty?
      end

      def append_top_line(top_line)
        lines << top_line
      end

      def append_body_lines(merged_top_line, mid_line, bottom_line)
        append_top_line(merged_top_line)
        append_merged_line(mid_line)
        append_merged_line(bottom_line)
      end

      def append_merged_line(next_line)
        current_line = lines.last
        lines << line_merger.merge_bottom(current_line, next_line)
      end

      def merged_top_line(top_line)
        return top_line unless previous_bottom

        line_merger.merge_top(lines.pop, top_line)
      end
    end
  end
end
