# frozen_string_literal: true

require_relative '../circuit'
require_relative '../sqrt_x_gate'

module Qni
  module View
    # Builds a circuit from a minimal subset of qni's ASCII-art view output.
    class AsciiCircuitParser
      # Raised when the provided ASCII art cannot be converted into a circuit.
      class Error < StandardError; end

      EMPTY_STEP_WIRE = '─────'
      MID_LINE_PATTERN = /\Aq(?<qubit>\d+): (?<wire>.+)\z/
      BOX_PATTERN = /\A┤(?<label>.+)├\z/
      FIXED_GATE_LABELS = {
        'H' => 'H',
        'S' => 'S',
        'S†' => 'S†',
        'T' => 'T',
        'T†' => 'T†',
        'X' => 'X',
        'Y' => 'Y',
        'Z' => 'Z',
        SqrtXGate::VIEW_SYMBOL => SqrtXGate::SYMBOL
      }.freeze

      def initialize(ascii_art)
        @ascii_art = ascii_art
      end

      def parse
        Circuit.empty(step: 0, qubit: qubit).tap do |circuit|
          next if empty_step?

          circuit.add_gate(gate:, step: 0, qubit:)
        end
      end

      private

      attr_reader :ascii_art

      def lines
        @lines ||= ascii_art.lines(chomp: true).map(&:rstrip).reject(&:empty?)
      end

      def parsed_mid_line
        @parsed_mid_line ||= begin
          mid_lines = lines.filter_map { |line| MID_LINE_PATTERN.match(line) }
          raise Error, 'ASCII parser currently supports exactly one qubit line' unless mid_lines.one?

          mid_lines.first
        end
      end

      def qubit
        parsed_mid_line[:qubit].to_i
      end

      def gate
        FIXED_GATE_LABELS.fetch(label) do
          raise Error, "unsupported ASCII gate label: #{label.inspect}"
        end
      end

      def empty_step?
        lines.one? && parsed_mid_line[:wire] == EMPTY_STEP_WIRE
      end

      def label
        @label ||= begin
          match = BOX_PATTERN.match(parsed_mid_line[:wire])
          raise Error, 'ASCII parser currently supports exactly one boxed gate' unless match

          validate_box_frame
          match[:label].strip
        end
      end

      def validate_box_frame
        raise Error, 'ASCII parser currently supports exactly three lines' unless lines.length == 3

        return if boxed_top_wire? && boxed_bottom_wire?

        raise Error, 'ASCII parser could not find a boxed gate frame'
      end

      def boxed_top_wire?
        top_wire&.start_with?('┌') && top_wire.end_with?('┐')
      end

      def boxed_bottom_wire?
        bottom_wire&.start_with?('└') && bottom_wire.end_with?('┘')
      end

      def top_wire
        @top_wire ||= wire_segment_for(lines.first)
      end

      def bottom_wire
        @bottom_wire ||= wire_segment_for(lines.last)
      end

      def wire_prefix
        @wire_prefix ||= ' ' * parsed_mid_line.begin(:wire)
      end

      def wire_segment_for(line)
        return unless line&.start_with?(wire_prefix)

        line.delete_prefix(wire_prefix)
      end
    end
  end
end
