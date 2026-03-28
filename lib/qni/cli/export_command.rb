# frozen_string_literal: true

require 'fileutils'
require_relative 'export_options'
require_relative '../export/png_exporter'
require_relative '../export/qcircuit_latex'
require_relative '../export/state_vector_latex'
require_relative '../symbolic_state_renderer'

module Qni
  class CLI < Thor
    # Executes qni export against a circuit file.
    class ExportCommand
      def initialize(circuit_file:, export_options:)
        @circuit_file = circuit_file
        @options = ExportOptions.new(export_options)
      end

      def execute
        options.validate
        export_loaded_circuit(circuit_file.load)
      rescue RuntimeError => e
        raise Thor::Error, e.message
      end

      private

      attr_reader :circuit_file, :options

      def export_loaded_circuit(circuit)
        return write_state_vector_png(circuit) if state_vector?

        export_circuit(circuit)
      end

      def export_circuit(circuit)
        latex_source = Export::QCircuitLatex.new(circuit, theme: options.theme).render
        if png?
          circuit_data = circuit.to_h
          return write_png(
            latex_source,
            width: circuit_data.fetch('cols').length * Export::PngExporter::CELL_SIZE_PX,
            height: circuit_data.fetch('qubits') * Export::PngExporter::CELL_SIZE_PX
          )
        end

        write_latex_source(latex_source)
      end

      def write_latex_source(latex_source)
        return latex_source unless output_path

        ensure_parent_directory
        File.write(output_path, "#{latex_source}\n")
        nil
      end

      def write_png(latex_source, width:, height:)
        Export::PngExporter.new(
          latex_source:,
          output_path:,
          target_width: width,
          target_height: height
        ).export
        nil
      end

      def write_state_vector_png(circuit)
        latex_formula = SymbolicStateRenderer.new(circuit.to_h).render_latex_formula
        latex_source = Export::StateVectorLatex.new(latex_formula:, theme: options.theme).render
        Export::PngExporter.new(latex_source:, output_path:).export
        nil
      end

      def ensure_parent_directory
        FileUtils.mkdir_p(File.dirname(output_path))
      end

      def png?
        options.png?
      end

      def output_path
        options.output_path
      end

      def state_vector?
        options.state_vector?
      end
    end
  end
end
