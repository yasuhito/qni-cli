# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni rm help text shown by qni rm and qni rm --help.
    class RemoveHelp
      TEXT = <<~HELP
        Usage:
          qni rm --qubit=N --step=N

        Overview:
          Remove the gate operation at one slot from ./circuit.json.
          step and qubit are 0-based indices.
          Controlled gates are removed as one operation from either control or target.
          SWAP is removed as one operation from either Swap slot.

        Options:
          --step=N   # 0-based step index
          --qubit=N  # 0-based qubit index

        Examples:
          qni rm --qubit 0 --step 0
      HELP
    end
  end
end
