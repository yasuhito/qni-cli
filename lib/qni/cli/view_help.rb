# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni view help text shown by qni view --help.
    module ViewHelp
      TEXT = <<~HELP
        Usage:
          qni view

        Overview:
          Render ./circuit.json as an ASCII circuit diagram.
          Output uses plain box-drawing text in non-TTY contexts.

        Examples:
          qni view
      HELP
    end
  end
end
