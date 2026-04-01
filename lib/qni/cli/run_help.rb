# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni run help text shown by qni run --help.
    module RunHelp
      TEXT = <<~HELP
        Usage:
          qni run [--symbolic] [--basis=BASIS]

        Overview:
          Simulate ./circuit.json and print the resulting state vector.
          Without --symbolic, output is numeric amplitudes in the computational basis.
          --symbolic prints a symbolic ket expression for supported small circuits.
          --basis currently works only with --symbolic and supports x or y for 1-qubit output, and bell for 2-qubit output.

        Options:
          [--symbolic]       # Show a 1-qubit symbolic state expression
          [--basis=BASIS]    # Show a symbolic state in a named basis such as x, y, or bell

        Examples:
          qni run
          qni run --symbolic
          qni run --symbolic --basis x
          qni run --symbolic --basis y
          qni run --symbolic --basis bell
      HELP
    end
  end
end
