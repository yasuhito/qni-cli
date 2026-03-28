# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Shared qni export help text shown by qni export and qni export --help.
    module ExportHelp
      TEXT = <<~HELP
        Usage:
          qni export --latex-source [--output=PATH]
          qni export --png --output=PATH
          qni export --state-vector --png --output=PATH

        Overview:
          Export ./circuit.json as qcircuit LaTeX or PNG.
          --latex-source writes qcircuit LaTeX to standard output by default.
          With --output=PATH, --latex-source writes the LaTeX file instead.
          --png renders the qcircuit LaTeX with pdflatex and converts the PDF to PNG with pdftocairo.
          --state-vector renders the symbolic state vector as LaTeX and converts it to PNG.
          qni export follows qni's step constraints, so one step can contain simple 1-qubit gates, one controlled gate, or one 2-qubit SWAP.

        Options:
          --latex-source  # write qcircuit LaTeX
          --png           # write PNG rendered from qcircuit LaTeX
          --state-vector  # write the symbolic state vector as PNG
          --dark          # draw white circuit lines for dark backgrounds (default)
          --light         # draw black circuit lines for light backgrounds
          [--output=PATH] # output file path; required for --png

        Examples:
          qni export --latex-source
          qni export --latex-source --output circuit.tex
          qni export --latex-source --light
          qni export --png --output circuit.png
          qni export --png --dark --output circuit.png
          qni export --state-vector --png --output state.png
      HELP
    end
  end
end
