# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni clear help text shown by qni clear --help.
    module ClearHelp
      TEXT = <<~HELP
        Usage:
          qni clear

        Overview:
          Delete ./circuit.json.
          If ./circuit.json does not exist, qni clear still succeeds.
          Standard output is empty on success.

        Examples:
          qni clear
      HELP
    end
  end
end
