# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni gate help text shown by qni gate and qni gate --help.
    module GateHelp
      TEXT = <<~HELP
        Usage:
          qni gate --qubit=N --step=N

        Overview:
          Print one serialized cell value from ./circuit.json.
          step and qubit are 0-based indices.
          If the cell contains "H", qni gate prints H.

        Options:
          --step=N   # 0-based step index
          --qubit=N  # 0-based qubit index

        Examples:
          qni gate --qubit 0 --step 0
      HELP
    end
  end
end
