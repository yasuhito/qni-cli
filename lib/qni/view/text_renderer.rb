# frozen_string_literal: true

require_relative 'compact_suffix_colorizer'
require_relative 'text_line_merger'
require_relative 'text_step_layer_builder'
require_relative 'text_wire_canvas'
require_relative 'text_wire_lines'

module Qni
  module View
    # Renders qni circuits as Qiskit-style box-drawing text.
    class TextRenderer
      def initialize(circuit, style: :plain)
        @circuit = circuit
        @style = style
      end

      def render
        output = draw_wires(step_layers).join("\n")
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
        canvas = TextWireCanvas.new(TextLineMerger.new)

        circuit.qubits.times do |qubit|
          canvas.append(wire_lines(layers, qubit))
        end

        canvas.to_a
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

      def wire_lines(layers, qubit)
        TextWireLines.new(
          layers,
          qubit,
          wire_label: wire_label(qubit),
          wire_label_width:,
          wire_prefix:
        ).to_a
      end
    end
  end
end
