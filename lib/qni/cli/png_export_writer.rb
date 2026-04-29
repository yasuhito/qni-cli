# frozen_string_literal: true

require_relative '../export/png_exporter'

module Qni
  class CLI < Thor
    # Writes circuit/state-vector LaTeX sources as PNG files.
    class PngExportWriter
      def initialize(output_path:, transparency:)
        @output_path = output_path
        @transparency = transparency
      end

      def write(latex_source, width: nil, height: nil)
        Export::PngExporter.new(
          latex_source:,
          output_path:,
          options: png_options(width:, height:)
        ).export
        nil
      end

      private

      attr_reader :output_path, :transparency

      def png_options(width:, height:)
        Export::PngExporter::ExportOptions.new(
          target_width: width,
          target_height: height,
          transparency:
        )
      end
    end
  end
end
