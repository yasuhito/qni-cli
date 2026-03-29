# frozen_string_literal: true

module Qni
  module View
    # Represents one fixed-width step cell from qni's ASCII circuit view.
    class AsciiStepCell
      EMPTY_STEP_WIRE = '─────'
      BOX_PATTERN = /\A┤(?<label>.+)├\z/

      def initialize(top_cell:, mid_cell:, bottom_cell:)
        @top_cell = top_cell
        @mid_cell = mid_cell
        @bottom_cell = bottom_cell
      end

      def empty?
        top_cell == blank_cell && mid_cell == EMPTY_STEP_WIRE && bottom_cell == blank_cell
      end

      def boxed_frame?
        top_cell.start_with?('┌') && top_cell.end_with?('┐') &&
          bottom_cell.start_with?('└') && bottom_cell.end_with?('┘')
      end

      def gate_label
        BOX_PATTERN.match(mid_cell)&.[](:label)&.strip
      end

      def gate_symbol(fixed_gate_labels)
        return nil if empty?

        label = validated_gate_label
        validate_boxed_frame

        fixed_gate_labels.fetch(label) do
          raise AsciiCircuitParser::Error, "unsupported ASCII gate label: #{label.inspect}"
        end
      end

      private

      attr_reader :bottom_cell, :mid_cell, :top_cell

      def validated_gate_label
        label = gate_label
        return label if label

        raise AsciiCircuitParser::Error,
              'ASCII parser currently supports boxed fixed gates and empty wires only'
      end

      def validate_boxed_frame
        return if boxed_frame?

        raise AsciiCircuitParser::Error, 'ASCII parser could not find a boxed gate frame'
      end

      def blank_cell
        @blank_cell ||= ' ' * mid_cell.length
      end
    end
  end
end
