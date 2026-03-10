# frozen_string_literal: true

module Qni
  # Phase-S gate definition used by the simulator.
  class SGate
    SYMBOL = 'S'
    IMAGINARY_UNIT = Complex(0, 1)

    def self.apply(zero_amplitude, one_amplitude)
      [zero_amplitude, IMAGINARY_UNIT * one_amplitude]
    end
  end
end
