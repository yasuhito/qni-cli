# frozen_string_literal: true

module Qni
  # Maps CLI gate spellings to the serialized symbols stored in circuit.json.
  module CliSupportedGates
    SUPPORTED_GATES = {
      'H' => 'H',
      'P' => PhaseGate::COMMAND_SYMBOL,
      'RX' => RxGate::COMMAND_SYMBOL,
      'RY' => RyGate::COMMAND_SYMBOL,
      'RZ' => RzGate::COMMAND_SYMBOL,
      'S' => 'S',
      'S†' => SDaggerGate::SYMBOL,
      'SWAP' => SwapGate::SYMBOL,
      'T' => 'T',
      'T†' => TDaggerGate::SYMBOL,
      'X' => 'X',
      'X^½' => SqrtXGate::SYMBOL,
      'Y' => 'Y',
      'Z' => 'Z',
      '√X' => SqrtXGate::SYMBOL
    }.freeze

    def self.normalize(gate)
      SUPPORTED_GATES.fetch(gate.to_s.upcase)
    end
  end
end
