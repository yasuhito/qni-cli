# frozen_string_literal: true

require_relative '../swap_gate'
require_relative '../sqrt_x_gate'
require_relative 'cell'

module Qni
  module View
    # Renders qni circuits as Qiskit-style box-drawing text.
    # rubocop:disable Metrics/ClassLength
    class TextRenderer
      ANGLED_GATE_PATTERN = /\A(?<symbol>[A-Za-z]+)\(.+\)\z/
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

      def initialize(circuit)
        @circuit = circuit
      end

      def render
        lines = draw_wires(step_layers)
        trim_blank_edges(lines).join("\n")
      end

      private

      attr_reader :circuit

      def step_layers
        circuit.to_h.fetch('cols').map do |raw_step|
          layer = build_layer(raw_step)
          normalize_width(layer)
          layer
        end
      end

      def build_layer(raw_step)
        layer = Array.new(circuit.qubits) { EmptyWire.new }

        render_swap_step(raw_step, layer)
        render_controlled_step(raw_step, layer)
        render_single_gates(raw_step, layer)

        layer
      end

      def render_swap_step(raw_step, layer)
        swap_qubits = raw_step.each_index.select { |index| raw_step.fetch(index) == SwapGate::SYMBOL }
        return unless swap_qubits.length == 2

        upper, lower = swap_qubits.minmax
        place_swap_endpoints(layer, upper, lower)
        place_swap_bridges(layer, raw_step, upper, lower)
      end

      def render_controlled_step(raw_step, layer)
        controls, targets = control_step_parts(raw_step)
        return unless controls.any? && targets.one?

        target = targets.first
        min_involved, max_involved = control_span(controls, target)
        place_controls(layer, controls, min_involved, max_involved)
        place_target(layer, raw_step, target, min_involved, max_involved)
        place_control_bridges(layer, raw_step, min_involved, max_involved)
      end

      def render_single_gates(raw_step, layer)
        raw_step.each_with_index do |slot, qubit|
          next unless single_gate_slot?(slot)
          next unless layer.fetch(qubit).is_a?(EmptyWire)

          layer[qubit] = BoxOnQuWire.new(view_label(slot))
        end
      end

      def single_gate_slot?(slot)
        slot != 1 && slot != Circuit::CONTROL_SYMBOL && slot != SwapGate::SYMBOL
      end

      def view_label(slot)
        return SqrtXGate::VIEW_SYMBOL if slot == SqrtXGate::SYMBOL

        slot.to_s.sub(ANGLED_GATE_PATTERN, '\k<symbol>')
      end

      def normalize_width(layer)
        longest = layer.map(&:length).max
        layer.each { |cell| cell.layer_width = longest }
      end

      def draw_wires(layers)
        lines = []
        previous_bottom = nil

        circuit.qubits.times do |qubit|
          top_line, mid_line, bottom_line = wire_lines(layers, qubit)
          previous_bottom = append_wire(lines, previous_bottom, top_line, mid_line, bottom_line)
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

      def control_step_parts(raw_step)
        controls = raw_step.each_index.select { |index| raw_step.fetch(index) == Circuit::CONTROL_SYMBOL }
        targets = raw_step.each_index.select do |index|
          single_gate_slot?(raw_step.fetch(index))
        end
        [controls, targets]
      end

      def control_span(controls, target)
        involved = controls + [target]
        involved.minmax
      end

      def place_controls(layer, controls, min_involved, max_involved)
        controls.each do |qubit|
          top_connect = qubit > min_involved ? '│' : ' '
          bot_connect = qubit < max_involved ? '│' : ' '
          layer[qubit] = Bullet.new(top_connect:, bot_connect:)
        end
      end

      def place_target(layer, raw_step, target, min_involved, max_involved)
        top_connect = target > min_involved ? '┴' : '─'
        bot_connect = target < max_involved ? '┬' : '─'
        layer[target] = BoxOnQuWire.new(view_label(raw_step.fetch(target)), top_connect:, bot_connect:)
      end

      def place_control_bridges(layer, raw_step, min_involved, max_involved)
        ((min_involved + 1)...max_involved).each do |qubit|
          next unless raw_step.fetch(qubit) == 1

          layer[qubit] = VerticalBridge.new
        end
      end

      def place_swap_endpoints(layer, upper, lower)
        layer[upper] = Ex.new(bot_connect: lower > upper ? '│' : ' ')
        layer[lower] = Ex.new(top_connect: upper < lower ? '│' : ' ')
      end

      def place_swap_bridges(layer, raw_step, upper, lower)
        ((upper + 1)...lower).each do |qubit|
          layer[qubit] = VerticalBridge.new if raw_step.fetch(qubit) == 1
        end
      end

      def append_wire(lines, previous_bottom, top_line, mid_line, bottom_line)
        lines << merged_top_line(lines, previous_bottom, top_line)
        lines << merge_lines(lines.last, mid_line, icod: 'bot')
        lines << merge_lines(lines.last, bottom_line, icod: 'bot')
        bottom_line
      end

      def merged_top_line(lines, previous_bottom, top_line)
        return top_line if previous_bottom.nil?

        merge_lines(lines.pop, top_line)
      end

      def wire_lines(layers, qubit)
        wire_cells = layers.map { |layer| layer.fetch(qubit) }
        [
          wire_prefix + cell_row(wire_cells, :top),
          wire_label(qubit).rjust(wire_label_width) + cell_row(wire_cells, :mid),
          wire_prefix + cell_row(wire_cells, :bot)
        ]
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
