# frozen_string_literal: true

require_relative '../angled_gates'
require_relative '../s_dagger_gate'
require_relative '../sqrt_x_gate'
require_relative '../t_dagger_gate'

module Qni
  module Export
    # Formats a single qni gate symbol as a qcircuit-compatible LaTeX label.
    class QCircuitGateLabel
      SPECIAL_GATE_LABELS = {
        SqrtXGate::SYMBOL => '\\sqrt{\\mathrm{X}}',
        SDaggerGate::SYMBOL => '\\mathrm{S^\\dagger}',
        TDaggerGate::SYMBOL => '\\mathrm{T^\\dagger}'
      }.freeze
      ANGLED_GATE_PATTERN = /\A(?<name>[A-Za-z]+)\((?<angle>.+)\)\z/

      def initialize(slot)
        @slot = slot
      end

      def render
        return angled_gate_label if angled_gate?
        return special_gate_label if special_gate?

        "\\mathrm{#{slot}}"
      end

      def gate_cell
        "\\gate{#{render}}"
      end

      private

      attr_reader :slot

      def angled_gate?
        AngledGates.parse(slot)
      end

      def angled_gate_label
        match = ANGLED_GATE_PATTERN.match(slot)
        raise "unsupported angled gate: #{slot}" unless match

        "\\mathrm{#{match[:name]}}(#{formatted_angle})"
      end

      def formatted_angle
        angled_gate_match[:angle].to_s.gsub('π', '\\pi').gsub(/(?<![A-Za-z])pi(?![A-Za-z])/, '\\pi')
      end

      def angled_gate_match
        @angled_gate_match ||= ANGLED_GATE_PATTERN.match(slot) || raise("unsupported angled gate: #{slot}")
      end

      def special_gate?
        SPECIAL_GATE_LABELS.key?(slot)
      end

      def special_gate_label
        SPECIAL_GATE_LABELS.fetch(slot)
      end
    end
  end
end
