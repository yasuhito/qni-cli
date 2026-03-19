# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni variable help text shown by qni variable and qni variable --help.
    module VariableHelp
      TEXT = <<~HELP
        Usage:
          qni variable set NAME ANGLE
          qni variable list
          qni variable unset NAME
          qni variable clear

        Overview:
          Manage symbolic angle variables in ./circuit.json.
          NAME must be an ASCII identifier such as theta.
          ANGLE must be concrete, such as π/4, pi/3, or 0.5.
          qni variable set requires ./circuit.json to already exist.
          qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
          qni run and qni expect resolve symbolic angles through these variables.

        Examples:
          qni variable set theta π/4
          qni variable list
          qni variable unset theta
          qni variable clear
      HELP
    end
  end
end
