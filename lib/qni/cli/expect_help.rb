# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni expect help text shown by qni expect and qni expect --help.
    module ExpectHelp
      TEXT = <<~HELP
        Usage:
          qni expect PAULI_STRING [PAULI_STRING...]

        Overview:
          Calculate expectation values from ./circuit.json.
          qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
          Each PAULI_STRING must use only I, X, Y, and Z.
          The length of each PAULI_STRING must match the circuit qubit count.
          Output is one line per observable in the form PAULI_STRING=value.

        Examples:
          qni expect Z
          qni expect ZZ XX
          qni expect ZZI IZZ XXX
      HELP
    end
  end
end
