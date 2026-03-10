# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni add help text shown by qni add and qni add --help.
    module AddHelp
      TEXT = <<~HELP
        Usage:
          qni add GATE --qubit=N --step=N
          qni add GATE --control=CONTROL --qubit=N --step=N
          qni add SWAP --qubit=N,N --step=N

        Overview:
          Add a gate to ./circuit.json.
          If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
          step and qubit are 0-based indices.
          Supported gates: H, X, Y, Z, S, T, SWAP.
          With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
          CNOT is written as qni add X --control 0 --qubit 1 --step 0.
          SWAP uses exactly two target qubits and writes "Swap" to both slots.

        Options:
          --step=N             # 0-based step index
          --qubit=N            # 0-based qubit index
          [--control=CONTROL]  # comma-separated control qubit indices

        Examples:
          qni add H --qubit 0 --step 0
          qni add X --qubit 1 --step 3
          qni add X --control 0 --qubit 1 --step 0
          qni add H --control 0 --qubit 2 --step 4
          qni add SWAP --qubit 0,1 --step 0
      HELP
    end
  end
end
