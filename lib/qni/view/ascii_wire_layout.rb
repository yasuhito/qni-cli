# frozen_string_literal: true

require_relative 'ascii_step_parser'

module Qni
  module View
    # Extracts aligned wire rows and step slices from circuit ASCII art.
    class AsciiWireLayout
      CELL_WIDTH = 5
      MID_LINE_PATTERN = /\Aq(?<qubit>\d+): (?<wire>.*)\z/

      # Holds parsed line data and wire-adjacent segments for one ASCII circuit.
      class LineSet
        BOX_BORDER_PATTERN = /[┌┐└┘├┤]/

        def initialize(ascii_art, error_class:)
          @ascii_art = ascii_art
          @error_class = error_class
        end

        def annotation_wire_segment(line_index)
          return unless adjacent_wire_segment(line_index - 1)&.match?(BOX_BORDER_PATTERN)

          annotation_candidate_segment(line_index - 2)
        end

        def adjacent_wire_segment(line_index)
          return if line_index.negative? || line_index >= lines.length

          line = lines[line_index]
          return if AsciiWireLayout::MID_LINE_PATTERN.match?(line)

          wire_segment_for(line)
        end

        def parsed_mid_lines
          @parsed_mid_lines ||= begin
            mid_lines = collect_mid_lines
            validate_mid_lines_present(mid_lines)
            validate_qubit_order(mid_lines)
            mid_lines
          end
        end

        def wire_width
          @wire_width ||= parsed_mid_lines.map { |(_line_index, match)| match[:wire].length }.max || 0
        end

        private

        attr_reader :ascii_art, :error_class

        def annotation_candidate_segment(candidate_index)
          return if candidate_index.negative? || candidate_index >= lines.length

          segment = annotation_segment(candidate_index)
          return unless segment && !segment.strip.empty? && !segment.match?(BOX_BORDER_PATTERN)

          segment
        end

        def annotation_segment(candidate_index)
          line = lines[candidate_index]
          return if AsciiWireLayout::MID_LINE_PATTERN.match?(line)

          wire_segment_for(line)
        end

        def collect_mid_lines
          lines.filter_map.with_index do |line, index|
            match = AsciiWireLayout::MID_LINE_PATTERN.match(line)
            [index, match] if match
          end
        end

        def lines
          @lines ||= ascii_art.lines(chomp: true).map(&:rstrip).reject(&:empty?)
        end

        def validate_mid_lines_present(mid_lines)
          raise error_class, 'ASCII parser requires at least one qubit line' if mid_lines.empty?
        end

        def validate_qubit_order(mid_lines)
          qubits = mid_lines.map { |(_line_index, match)| match[:qubit].to_i }
          return if qubits == (0...qubits.length).to_a

          raise error_class, 'ASCII parser requires q0..qn qubit order'
        end

        def wire_label_width
          @wire_label_width ||= parsed_mid_lines.map { |(_line_index, match)| match.begin(:wire) }.max
        end

        def wire_prefix
          @wire_prefix ||= ' ' * wire_label_width
        end

        def wire_segment_for(line)
          raise error_class, 'ASCII parser lines must align to whole step cells' unless line.start_with?(wire_prefix)

          line.delete_prefix(wire_prefix)
        end
      end

      # Detects whether a wire contains a box boundary starting at one position.
      class BoxWidthDetector
        CLOSING_CHAR = {
          '┌' => '┐',
          '└' => '┘'
        }.freeze

        def initialize(wire)
          @wire = wire
        end

        def width_from(position)
          start_char = wire[position]
          return unless %w[┌ └].include?(start_char)

          closing_index = wire.index(CLOSING_CHAR.fetch(start_char), position)
          return unless closing_index

          closing_index - position + 1
        end

        private

        attr_reader :wire
      end

      # Holds the visible annotation/top/mid/bottom strings for one qubit row.
      class WireRow
        def initialize(annotation:, top:, mid:, bottom:)
          @annotation = annotation
          @top = top
          @mid = mid
          @bottom = bottom
        end

        def box_widths_at(position)
          [top, bottom].filter_map { |wire| BoxWidthDetector.new(wire).width_from(position) }
        end

        def step_slice(position, step_width)
          {
            annotation: annotation[position, step_width],
            top: top[position, step_width],
            mid: mid[position, step_width],
            bottom: bottom[position, step_width]
          }
        end

        private

        attr_reader :annotation, :bottom, :mid, :top
      end

      def initialize(ascii_art, error_class:)
        @ascii_art = ascii_art
        @error_class = error_class
      end

      def each_step
        return enum_for(:each_step) unless block_given?

        each_step_position { |position| yield step_slices(position) }
      end

      def to_circuit_h
        {
          'qubits' => qubit_count,
          'cols' => each_step.map { |step_slices| AsciiStepParser.new(step_slices, error_class: @error_class).to_slots }
        }
      end

      def qubit_count = line_set.parsed_mid_lines.length

      private

      attr_reader :ascii_art, :error_class

      def each_step_position
        position = 0
        while position < wire_width
          yield position
          position += step_width_at(position)
        end
      end

      def step_slices(position)
        step_width = step_width_at(position)
        wire_rows.map { |wire_row| wire_row.step_slice(position, step_width) }
      end

      def step_width_at(position)
        width = box_widths_at(position).max
        return width if width
        return CELL_WIDTH if (wire_width - position) >= CELL_WIDTH

        raise error_class, 'ASCII parser lines must align to whole step cells'
      end

      def box_widths_at(position)
        wire_rows.flat_map { |wire_row| wire_row.box_widths_at(position) }
      end

      def wire_rows
        @wire_rows ||= line_set.parsed_mid_lines.map { |line_index, match| build_wire_row(line_index, match) }
      end

      def build_wire_row(line_index, match)
        layout_lines = line_set

        WireRow.new(
          annotation: padded_wire_segment(layout_lines.annotation_wire_segment(line_index)),
          top: padded_wire_segment(layout_lines.adjacent_wire_segment(line_index - 1)),
          mid: padded_wire_segment(match[:wire]),
          bottom: padded_wire_segment(layout_lines.adjacent_wire_segment(line_index + 1))
        )
      end

      def padded_wire_segment(segment) = segment.to_s.ljust(wire_width)

      def line_set
        @line_set ||= LineSet.new(ascii_art, error_class:)
      end

      def wire_width
        line_set.wire_width
      end
    end
  end
end
