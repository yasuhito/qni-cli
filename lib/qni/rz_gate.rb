# frozen_string_literal: true

require_relative 'angled_gate'

module Qni
  # Parameterized rotation around the Z axis.
  class RzGate < AngledGate
    COMMAND_SYMBOL = 'Rz'

    def apply(zero_amplitude, one_amplitude)
      [negative_phase * zero_amplitude, positive_phase * one_amplitude]
    end

    private

    def half_angle
      @half_angle ||= angle.radians / 2
    end

    def negative_phase
      @negative_phase ||= Complex(Math.cos(half_angle), -Math.sin(half_angle))
    end

    def positive_phase
      @positive_phase ||= Complex(Math.cos(half_angle), Math.sin(half_angle))
    end
  end
end
