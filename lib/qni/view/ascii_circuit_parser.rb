# frozen_string_literal: true

require_relative '../circuit'
require_relative '../sqrt_x_gate'
require_relative 'ascii_step_cell'
require_relative 'ascii_step_rows'

module Qni
  module View
    # Builds a circuit from a minimal subset of qni's ASCII-art view output.
    class AsciiCircuitParser
      # Raised when the provided ASCII art cannot be converted into a circuit.
      class Error < StandardError; end

      CELL_WIDTH = 5
      EMPTY_STEP_WIRE = '─────'
      MID_LINE_PATTERN = /\Aq(?<qubit>\d+): (?<wire>.+)\z/
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
        steps = parsed_steps

        Circuit.empty(step: steps.length - 1, qubit: qubit).tap do |circuit|
          steps.each_with_index do |gate_symbol, step|
            next unless gate_symbol

            circuit.add_gate(gate: gate_symbol, step:, qubit:)
          end
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

      def parsed_steps
        @parsed_steps ||= if empty_step?
                            [nil]
                          else
                            validate_box_frame
                            step_rows.cells.map { |step_cell| step_cell.gate_symbol(FIXED_GATE_LABELS) }
                          end
      end

      def empty_step?
        lines.one? && parsed_mid_line[:wire] == EMPTY_STEP_WIRE
      end

      def validate_box_frame
        validate_line_count
        validate_cell_alignment
        validate_cell_count
      end

      def validate_line_count
        return if lines.length == 3

        raise Error, 'ASCII parser currently supports exactly three lines'
      end

      def validate_cell_alignment
        return if step_rows.whole_cells?

        raise Error, 'ASCII parser lines must align to whole step cells'
      end

      def validate_cell_count
        return if step_rows.uniform_cell_count?

        raise Error, 'ASCII parser could not find a boxed gate frame'
      end

      def step_rows
        @step_rows ||= AsciiStepRows.new(
          top_wire: wire_segment_for(lines.first),
          mid_wire: parsed_mid_line[:wire],
          bottom_wire: wire_segment_for(lines.last),
          cell_width: CELL_WIDTH
        )
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
