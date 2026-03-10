# frozen_string_literal: true

module Qni
  # S dagger gate definition used by the simulator.
  class SDaggerGate
    SYMBOL = 'S†'
    NEGATIVE_IMAGINARY_UNIT = Complex(0, -1)

    def self.apply(zero_amplitude, one_amplitude)
      [zero_amplitude, NEGATIVE_IMAGINARY_UNIT * one_amplitude]
    end
  end
end
