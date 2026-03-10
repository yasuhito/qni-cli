# frozen_string_literal: true

module Qni
  # Pauli-Z gate definition used by the simulator.
  class ZGate
    SYMBOL = 'Z'

    def self.apply(zero_amplitude, one_amplitude)
      [zero_amplitude, -one_amplitude]
    end
  end
end
