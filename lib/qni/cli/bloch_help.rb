# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni bloch help text shown by qni bloch and qni bloch --help.
    module BlochHelp
      TEXT = <<~HELP
        Usage:
          qni bloch --png --output bloch.png
          qni bloch --gif --output bloch.gif

        Overview:
          Render the current 1-qubit state on the Bloch sphere.
          --png writes a static Bloch sphere image.
          --gif writes an animated Bloch sphere showing state evolution.
          The first release supports only 1-qubit circuits with fully resolved numeric parameters.

        Options:
          --png           # write a Bloch sphere PNG
          --gif           # write a Bloch sphere GIF
          --dark          # draw light content for dark backgrounds (default)
          --light         # draw dark content for light backgrounds
          [--output=PATH] # output file path; required

        Examples:
          qni bloch --png --output bloch.png
          qni bloch --gif --output bloch.gif
          qni bloch --png --light --output bloch.png
      HELP
    end
  end
end
