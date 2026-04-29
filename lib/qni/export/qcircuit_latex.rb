# frozen_string_literal: true

require_relative '../circuit'
require_relative 'qcircuit_caption'
require_relative 'qcircuit_column'

module Qni
  module Export
    # Renders qni's serialized circuit columns as a qcircuit LaTeX document.
    class QCircuitLatex
      DOCUMENT_HEADER_LINES = [
        '\\documentclass[border=24px]{standalone}',
        '',
        '\\usepackage[braket, qm]{qcircuit}',
        '\\usepackage{graphicx}',
        '\\usepackage{textcomp}',
        '\\usepackage{xcolor}',
        '',
        '\\begin{document}'
      ].freeze
      DOCUMENT_FOOTER_LINES = [
        '\\end{document}'
      ].freeze
      CIRCUIT_HEADER_LINES = [
        '\\scalebox{1.0}{'
      ].freeze
      CIRCUIT_FOOTER_LINES = [
        '\\\\ }',
        '}'
      ].freeze
      EMPTY_CIRCUIT_MIN_COLUMNS = 3

      def initialize(circuit, theme: :dark, **caption_options)
        @data = circuit.to_h
        @theme = theme
        @caption = QCircuitCaption.from_options(caption_options)
      end

      def render
        document_lines.join("\n")
      end

      private

      attr_reader :caption, :data, :theme

      def document_lines
        DOCUMENT_HEADER_LINES + [theme_color_line, '\\begin{tabular}{c}'] + top_caption_lines + circuit_lines +
          bottom_caption_lines + ['\\end{tabular}'] + DOCUMENT_FOOTER_LINES
      end

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

      def circuit_lines
        CIRCUIT_HEADER_LINES + [qcircuit_opening_line, rendered_rows] + CIRCUIT_FOOTER_LINES
      end

      def top_caption_lines
        return [] unless caption.position_top?

        caption.lines + ['\\\\[0.8em]']
      end

      def bottom_caption_lines
        return [] unless caption.position_bottom?

        ['\\\\[0.8em]'] + caption.lines
      end

      def qcircuit_opening_line
        '\\Qcircuit @C=0.55em @R=2.2em @!R { \\\\'
      end

      def wire_label(qubit)
        "\\push{q#{qubit}: \\ket{0}}"
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
        @column_renderers ||= rendered_columns.map { |column| QCircuitColumn.new(column) }
      end

      def rendered_columns
        columns = data.fetch('cols')
        return columns unless columns.empty?

        Array.new(EMPTY_CIRCUIT_MIN_COLUMNS) { Array.new(qubits, 1) }
      end
    end
  end
end
