# frozen_string_literal: true

require 'fileutils'
require_relative 'export_options'
require_relative 'png_export_writer'
require_relative '../export/circle_notation_png'
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
        return write_state_vector_png(circuit) if options.state_vector?
        return write_circle_notation_png(circuit) if options.circle_notation?

        export_circuit(circuit)
      end

      def export_circuit(circuit)
        latex_source = rendered_circuit_latex(circuit)
        return write_circuit_png(latex_source, circuit) if options.png?

        write_latex_source(latex_source)
      end

      def rendered_circuit_latex(circuit)
        Export::QCircuitLatex.new(
          circuit,
          theme: options.theme,
          **options.caption_options_hash
        ).render
      end

      def write_circuit_png(latex_source, circuit)
        return write_png(latex_source) if options.caption?

        circuit_data = circuit.to_h
        write_png(
          latex_source,
          width: circuit_data.fetch('cols').length * Export::PngExporter::CELL_SIZE_PX,
          height: circuit_data.fetch('qubits') * Export::PngExporter::CELL_SIZE_PX
        )
      end

      def write_latex_source(latex_source)
        path = options.output_path
        return latex_source unless path

        ensure_parent_directory
        File.write(path, "#{latex_source}\n")
        nil
      end

      def write_png(latex_source, width: nil, height: nil)
        png_writer.write(latex_source, width:, height:)
      end

      def write_state_vector_png(circuit)
        latex_formula = SymbolicStateRenderer.new(circuit.to_h).render_latex_formula
        latex_source = Export::StateVectorLatex.new(latex_formula:, theme: options.theme).render
        png_writer.write(latex_source)
      end

      def write_circle_notation_png(circuit)
        Export::CircleNotationPng.new(
          state_vector: Simulator.new(circuit).final_state_vector,
          output_path: options.output_path,
          theme: options.theme
        ).export
        nil
      end

      def ensure_parent_directory
        FileUtils.mkdir_p(File.dirname(options.output_path))
      end

      def png_writer
        @png_writer ||= PngExportWriter.new(output_path: options.output_path, transparency: options.png_transparency)
      end
    end
  end
end
