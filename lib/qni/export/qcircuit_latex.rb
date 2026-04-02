# frozen_string_literal: true

require_relative '../circuit'
require_relative 'qcircuit_column'

module Qni
  module Export
    # Renders qni's serialized circuit columns as a qcircuit LaTeX document.
    class QCircuitLatex
      HEADER_LINES = [
        '\\documentclass[border=2px]{standalone}',
        '',
        '\\usepackage[braket, qm]{qcircuit}',
        '\\usepackage{graphicx}',
        '\\usepackage{xcolor}',
        '',
        '\\begin{document}',
        '\\scalebox{1.0}{'
      ].freeze
      FOOTER_LINES = [
        '\\\\ }}',
        '\\end{document}'
      ].freeze

      def initialize(circuit, theme: :dark)
        @circuit = circuit
        @data = circuit.to_h
        @theme = theme
      end

      def render
        (HEADER_LINES + [theme_color_line, qcircuit_opening_line, rendered_rows] + FOOTER_LINES).join("\n")
      end

      private

      attr_reader :circuit, :data, :theme

      def qubits
        data.fetch('qubits')
      end

      def rendered_rows
        (0...qubits).map do |qubit|
          "  #{wire_label(qubit)} & #{rendered_cells(qubit).join(' & ')}\\\\"
        end.join("\n")
      end

      def theme_color_line
        "\\color{#{theme_color_name}}"
      end

      def qcircuit_opening_line
        '\\Qcircuit @C=1.0em @R=0.7em @!R { \\\\'
      end

      def wire_label(qubit)
        "\\lstick{q#{qubit}: \\ket{0}}"
      end

      def rendered_cells(qubit)
        column_renderers.map { |column| column.render_for(qubit) } + ['\\qw']
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

      def column_renderers
        @column_renderers ||= data.fetch('cols').map { |column| QCircuitColumn.new(column) }
      end
    end
  end
end
