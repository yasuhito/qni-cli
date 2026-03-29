# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni state help text shown by qni state and qni state --help.
    module StateHelp
      TEXT = <<~HELP
        Usage:
          qni state set "alpha|0> + beta|1>"
          qni state show
          qni state clear

        Overview:
          Manage the initial state vector in ./circuit.json.
          The first release supports 1-qubit ket sums such as alpha|0> + beta|1>.
          Coefficients can be numeric literals or ASCII identifiers such as alpha.
          qni state clear removes the explicit initial state and falls back to |0>.

        Examples:
          qni state set "alpha|0> + beta|1>"
          qni state show
          qni state clear
      HELP
    end
  end
end
