# frozen_string_literal: true

module Qni
  # Pauli-Y gate definition used by the simulator.
  class YGate
    SYMBOL = 'Y'
    IMAGINARY_UNIT = Complex(0, 1)

    def self.apply(zero_amplitude, one_amplitude)
      [
        -IMAGINARY_UNIT * one_amplitude,
        IMAGINARY_UNIT * zero_amplitude
      ]
    end
  end
end
