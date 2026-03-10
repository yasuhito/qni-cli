# frozen_string_literal: true

require_relative 'angled_gate'

module Qni
  # Parameterized rotation around the Y axis.
  class RyGate < AngledGate
    COMMAND_SYMBOL = 'Ry'

    def apply(zero_amplitude, one_amplitude)
      [
        (cosine * zero_amplitude) - (sine * one_amplitude),
        (sine * zero_amplitude) + (cosine * one_amplitude)
      ]
    end

    private

    def cosine
      @cosine ||= Math.cos(half_angle)
    end

    def half_angle
      @half_angle ||= angle.radians / 2
    end

    def sine
      @sine ||= Math.sin(half_angle)
    end
  end
end
