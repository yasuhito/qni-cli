# frozen_string_literal: true

require_relative '../sqrt_x_gate'
require_relative 'cell'

module Qni
  module View
    # Builds one text-rendered gate cell, including angled-gate annotations.
    class TextGateCell
      ANGLED_GATE_PATTERN = /\A(?<symbol>[A-Za-z]+)\((?<angle>.+)\)\z/

      def initialize(slot, top_connect: '─', bot_connect: '─')
        @slot = slot
        @top_connect = top_connect
        @bot_connect = bot_connect
      end

      def build
        return BoxOnQuWire.build(label, top_connect:, bot_connect:) unless angled_match

        AngledBoxOnQuWire.new(
          label,
          rendered_angle,
          format: AngledBoxOnQuWire.format_for(label),
          top_connect:,
          bot_connect:
        )
      end

      private

      attr_reader :bot_connect, :slot, :top_connect

      def angled_match
        @angled_match ||= ANGLED_GATE_PATTERN.match(slot.to_s)
      end

      def label
        return SqrtXGate::VIEW_SYMBOL if slot == SqrtXGate::SYMBOL

        angled_match ? angled_match[:symbol] : slot.to_s
      end

      def rendered_angle
        angled_match[:angle].to_s.gsub('theta', 'θ').gsub(/(?<=\d)\*θ/, 'θ')
      end
    end
  end
end
