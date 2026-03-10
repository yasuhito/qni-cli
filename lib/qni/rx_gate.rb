# frozen_string_literal: true

require_relative 'angled_gate'

module Qni
  # Parameterized rotation around the X axis.
  class RxGate < AngledGate
    COMMAND_SYMBOL = 'Rx'

    def apply(zero_amplitude, one_amplitude)
      [
        (cosine * zero_amplitude) - (imaginary_sine * one_amplitude),
        (-imaginary_sine * zero_amplitude) + (cosine * one_amplitude)
      ]
    end

    private

    def cosine
      @cosine ||= Math.cos(half_angle)
    end

    def half_angle
      @half_angle ||= angle.radians / 2
    end

    def imaginary_sine
      @imaginary_sine ||= Complex(0, Math.sin(half_angle))
    end
  end
end
