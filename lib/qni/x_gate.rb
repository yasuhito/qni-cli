# frozen_string_literal: true

module Qni
  # Pauli-X gate definition used by the simulator.
  class XGate
    SYMBOL = 'X'

    def self.apply(zero_amplitude, one_amplitude)
      [one_amplitude, zero_amplitude]
    end
  end
end
