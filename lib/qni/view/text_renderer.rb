# frozen_string_literal: true

require_relative '../swap_gate'
require_relative 'cell'
require_relative 'compact_suffix_colorizer'
require_relative 'text_step_layer_builder'

module Qni
  module View
    # Renders qni circuits as Qiskit-style box-drawing text.
    # rubocop:disable Metrics/ClassLength
    class TextRenderer
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

      def initialize(circuit, style: :plain)
        @circuit = circuit
        @style = style
      end

      def render
        lines = draw_wires(step_layers)
        output = trim_blank_edges(lines).join("\n")
        return output unless colorized?

        CompactSuffixColorizer.colorize(output)
      end

      private

      attr_reader :circuit, :style

      def step_layers
        circuit.to_h.fetch('cols').map do |raw_step|
          TextStepLayerBuilder.new(raw_step, circuit.qubits).build
        end
      end

      def colorized?
        style == :colorized
      end

      def draw_wires(layers)
        lines = []
        previous_bottom = nil

        circuit.qubits.times do |qubit|
          previous_bottom = append_wire(lines, previous_bottom, wire_lines(layers, qubit))
        end

        lines
      end

      def wire_label(qubit)
        "q#{qubit}: "
      end

      def wire_prefix
        ' ' * wire_label_width
      end

      def wire_label_width
        @wire_label_width ||= wire_label(circuit.qubits - 1).length
      end

      def trim_blank_edges(lines)
        trimmed = lines.dup
        trimmed.shift while trimmed.first&.strip == ''
        trimmed.pop while trimmed.last&.strip == ''
        trimmed
      end

      def merge_lines(top, bot, icod: 'top')
        top.chars.zip(bot.chars).map do |top_char, bot_char|
          merge_chars(top_char, bot_char, icod)
        end.join
      end

      def append_wire(lines, previous_bottom, wire_lines)
        annotation_line, top_line, mid_line, bottom_line = wire_lines
        merged_top = merged_top_line(lines, previous_bottom, top_line)
        lines << annotation_line unless annotation_line.strip.empty?
        lines << merged_top
        lines << merge_lines(lines.last, mid_line, icod: 'bot')
        lines << merge_lines(lines.last, bottom_line, icod: 'bot')
        bottom_line
      end

      def merged_top_line(lines, previous_bottom, top_line)
        return top_line if previous_bottom.nil?

        merge_lines(lines.pop, top_line)
      end

      def wire_lines(layers, qubit)
        wire_cells = wire_cells_for(layers, qubit)
        [
          framed_wire_line(wire_cells, :annotation),
          framed_wire_line(wire_cells, :top),
          labeled_wire_line(qubit, wire_cells),
          framed_wire_line(wire_cells, :bot)
        ]
      end

      def wire_cells_for(layers, qubit)
        layers.map { |layer| layer.fetch(qubit) }
      end

      def framed_wire_line(wire_cells, part)
        wire_prefix + cell_row(wire_cells, part)
      end

      def labeled_wire_line(qubit, wire_cells)
        wire_label(qubit).rjust(wire_label_width) + cell_row(wire_cells, :mid)
      end

      def cell_row(wire_cells, part)
        wire_cells.map { |cell| cell.public_send(part) }.join
      end

      def merge_chars(top_char, bot_char, icod)
        return top_char if top_char == bot_char
        return bot_char if top_char == ' '
        return merge_blank_bot(top_char, icod) if bot_char == ' '

        top_priority_merge(top_char, bot_char, icod) ||
          INTERSECTION_MERGES[[top_char, bot_char]] ||
          bot_char
      end

      # rubocop:disable Metrics/CyclomaticComplexity
      def top_priority_merge(top_char, bot_char, icod)
        return unless icod == 'top'
        return top_char if ['┬', '╥'].include?(top_char) && ['║', '│'].include?(bot_char)
        return TOP_CORNER_MERGES[[top_char, bot_char]] if TOP_CORNER_MERGES.key?([top_char, bot_char])
        return '┬' if ['┐', '┌'].include?(bot_char)

        '┴' if ['┘', '└'].include?(top_char) && bot_char == '─'
      end
      # rubocop:enable Metrics/CyclomaticComplexity

      def merge_blank_bot(top_char, icod)
        return blank_bot_with_bottom_priority(top_char) if icod == 'bot'
        return blank_bot_with_top_priority(top_char) if icod == 'top'

        blank_bot_common(top_char) || ' '
      end

      def blank_bot_with_bottom_priority(top_char)
        return '│' if ['│', '┼', '╪', '┬'].include?(top_char)
        return '║' if top_char == '╥'

        blank_bot_common(top_char) || ' '
      end

      def blank_bot_with_top_priority(top_char)
        blank_bot_common(top_char) || top_char
      end

      def blank_bot_common(top_char)
        return '│' if ['│', '┼', '╪'].include?(top_char)
        return '║' if ['║', '╫', '╬'].include?(top_char)

        nil
      end
    end
    # rubocop:enable Metrics/ClassLength
  end
end
