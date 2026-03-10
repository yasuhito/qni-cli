# frozen_string_literal: true

module Qni
  # Square-root-of-X gate definition used by the simulator.
  class SqrtXGate
    SYMBOL = 'X^½'
    VIEW_SYMBOL = '√X'
    COMPLEX_PLUS = Complex(0.5, 0.5)
    COMPLEX_MINUS = Complex(0.5, -0.5)

    def self.apply(zero_amplitude, one_amplitude)
      [
        (COMPLEX_PLUS * zero_amplitude) + (COMPLEX_MINUS * one_amplitude),
        (COMPLEX_MINUS * zero_amplitude) + (COMPLEX_PLUS * one_amplitude)
      ]
    end
  end
end
