# frozen_string_literal: true

module Qni
  class HGate
    SYMBOL = 'H'
    SCALE = 1.0 / Math.sqrt(2)

    def self.apply(zero_amplitude, one_amplitude)
      [
        (zero_amplitude + one_amplitude) * SCALE,
        (zero_amplitude - one_amplitude) * SCALE
      ]
    end
  end
end
