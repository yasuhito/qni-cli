# frozen_string_literal: true

module Qni
  module Export
    # Wraps a symbolic state-vector formula in a standalone LaTeX document.
    class StateVectorLatex
      HEADER_LINES = [
        '\\documentclass[border=2px]{standalone}',
        '',
        '\\usepackage{amsmath}',
        '\\usepackage{amssymb}',
        '\\usepackage{xcolor}',
        '',
        '\\begin{document}'
      ].freeze
      FOOTER_LINES = [
        '\\end{document}'
      ].freeze

      def initialize(latex_formula:, theme: :dark)
        @latex_formula = latex_formula
        @theme = theme
      end

      def render
        (HEADER_LINES + body_lines + FOOTER_LINES).join("\n")
      end

      private

      attr_reader :latex_formula, :theme

      def body_lines
        ["{#{theme_color_line}$\\displaystyle #{latex_formula}$}"]
      end

      def theme_color_line
        "\\color{#{theme_color_name}}"
      end

      def theme_color_name
        case theme
        when :dark
          'white'
        when :light
          'black'
        else
          raise "unsupported export theme: #{theme.inspect}"
        end
      end
    end
  end
end
