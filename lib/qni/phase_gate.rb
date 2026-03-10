# frozen_string_literal: true

require_relative 'angled_gate'

module Qni
  # Parameterized phase gate used for add serialization and run simulation.
  class PhaseGate < AngledGate
    COMMAND_SYMBOL = 'P'

    def apply(zero_amplitude, one_amplitude)
      [zero_amplitude, phase_factor * one_amplitude]
    end

    private

    attr_reader :angle

    def phase_factor
      @phase_factor ||= begin
        radians = angle.radians
        Complex(Math.cos(radians), Math.sin(radians))
      end
    end
  end
end
