# frozen_string_literal: true

module Qni
  # T dagger gate definition used by the simulator.
  class TDaggerGate
    SYMBOL = 'T†'
    PHASE = Complex(Math.cos(Math::PI / 4), -Math.sin(Math::PI / 4))

    def self.apply(zero_amplitude, one_amplitude)
      [zero_amplitude, PHASE * one_amplitude]
    end
  end
end
