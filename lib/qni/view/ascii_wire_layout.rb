# frozen_string_literal: true

module Qni
  module View
    # Extracts aligned wire rows and step slices from circuit ASCII art.
    class AsciiWireLayout
      CELL_WIDTH = 5
      MID_LINE_PATTERN = /\Aq(?<qubit>\d+): (?<wire>.*)\z/

      # Holds the visible top/mid/bottom strings for one qubit row.
      WireRow = Struct.new(:top, :mid, :bottom)

      def initialize(ascii_art, error_class:)
        @ascii_art = ascii_art
        @error_class = error_class
      end

      def each_step
        return enum_for(:each_step) unless block_given?

        position = 0
        while position < wire_width
          step_width = step_width_at(position)
          yield step_slices(position, step_width)
          position += step_width
        end
      end

      def qubit_count = parsed_mid_lines.length

      private

      attr_reader :ascii_art, :error_class

      def step_slices(position, step_width)
        wire_rows.map do |wire_row|
          {
            top: wire_row.top[position, step_width],
            mid: wire_row.mid[position, step_width],
            bottom: wire_row.bottom[position, step_width]
          }
        end
      end

      def step_width_at(position)
        width = box_widths_at(position).max
        return width if width
        return CELL_WIDTH if (wire_width - position) >= CELL_WIDTH

        raise error_class, 'ASCII parser lines must align to whole step cells'
      end

      def box_widths_at(position)
        wire_rows.flat_map do |wire_row|
          [wire_row.top, wire_row.bottom].filter_map { |wire| box_width_from(wire, position) }
        end
      end

      def box_width_from(wire, position)
        start_char = wire[position]
        return unless %w[┌ └].include?(start_char)

        closing_char = start_char == '┌' ? '┐' : '┘'
        closing_index = wire.index(closing_char, position)
        return unless closing_index

        closing_index - position + 1
      end

      def wire_rows
        @wire_rows ||= parsed_mid_lines.map do |line_index, match|
          WireRow.new(
            padded_wire_segment(adjacent_wire_segment(line_index - 1)),
            padded_wire_segment(match[:wire]),
            padded_wire_segment(adjacent_wire_segment(line_index + 1))
          )
        end
      end

      def adjacent_wire_segment(line_index)
        return if line_index.negative? || line_index >= lines.length

        line = lines[line_index]
        return if mid_line?(line)

        wire_segment_for(line)
      end

      def padded_wire_segment(segment) = segment.to_s.ljust(wire_width)

      def wire_segment_for(line)
        raise error_class, 'ASCII parser lines must align to whole step cells' unless line.start_with?(wire_prefix)

        line.delete_prefix(wire_prefix)
      end

      def parsed_mid_lines
        @parsed_mid_lines ||= begin
          mid_lines = lines.filter_map.with_index do |line, index|
            match = MID_LINE_PATTERN.match(line)
            [index, match] if match
          end
          raise error_class, 'ASCII parser requires at least one qubit line' if mid_lines.empty?

          validate_qubit_order(mid_lines)
          mid_lines
        end
      end

      def validate_qubit_order(mid_lines)
        qubits = mid_lines.map { |(_line_index, match)| match[:qubit].to_i }
        return if qubits == (0...qubits.length).to_a

        raise error_class, 'ASCII parser requires q0..qn qubit order'
      end

      def wire_prefix
        @wire_prefix ||= ' ' * wire_label_width
      end

      def wire_label_width
        @wire_label_width ||= parsed_mid_lines.map { |(_line_index, match)| match.begin(:wire) }.max
      end

      def wire_width
        @wire_width ||= parsed_mid_lines.map { |(_line_index, match)| match[:wire].length }.max || 0
      end

      def lines
        @lines ||= ascii_art.lines(chomp: true).map(&:rstrip).reject(&:empty?)
      end

      def mid_line?(line) = MID_LINE_PATTERN.match?(line)
    end
  end
end
