# frozen_string_literal: true

require_relative '../angled_gates'
require_relative '../sqrt_x_gate'
require_relative 'ascii_step_mid_cell'

module Qni
  module View
    # Resolves one ASCII step slice into a serialized gate symbol when boxed.
    class AsciiGateSymbolResolver
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
      ANGLED_GATE_ERROR = 'ASCII parser angled gates require a dedicated angle line above the box'
      UNEXPECTED_ANGLE_ERROR = 'ASCII parser angle lines are only supported for Rx, Ry, Rz, and P boxes'

      def initialize(error_class:)
        @error_class = error_class
      end

      def resolve(step_slice)
        label = AsciiStepMidCell.new(step_slice.fetch(:mid)).gate_label
        return unless label

        annotation = step_slice.fetch(:annotation).to_s.strip
        return legacy_angled_gate_error if AngledGates.parse(label)

        angled_gate_symbol_for(label, annotation) ||
          fixed_gate_symbol_for(label, annotation)
      end

      private

      def angled_gate_symbol_for(label, annotation)
        gate_class = AngledGates.fetch(label)
        return unless gate_class

        raise @error_class, ANGLED_GATE_ERROR if annotation.empty?

        gate_class.serialized(annotation)
      end

      def fixed_gate_symbol_for(label, annotation)
        raise_unexpected_angle_line(annotation)

        FIXED_GATE_LABELS.fetch(label) do
          raise @error_class, "unsupported ASCII gate label: #{label.inspect}"
        end
      end

      def raise_unexpected_angle_line(annotation)
        return if annotation.empty?

        raise @error_class, UNEXPECTED_ANGLE_ERROR
      end

      def legacy_angled_gate_error
        raise @error_class, ANGLED_GATE_ERROR
      end
    end
  end
end
