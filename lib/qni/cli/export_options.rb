# frozen_string_literal: true

require_relative 'export_caption_options'
require_relative 'export_options_validator'
require_relative '../export/png_exporter'

module Qni
  class CLI < Thor
    # Normalizes and validates qni export CLI options.
    class ExportOptions
      def initialize(raw_options)
        @raw_options = raw_options
        @caption_options = ExportCaptionOptions.new(raw_options)
      end

      def validate
        ExportOptionsValidator.new(self, caption_options).validate
      end

      def latex_source?
        raw_options.fetch(:latex_source)
      end

      def png?
        raw_options.fetch(:png)
      end

      def state_vector?
        raw_options.fetch(:state_vector, false)
      end

      def circle_notation?
        raw_options.fetch(:circle_notation, false)
      end

      def output_path
        path = raw_options.fetch(:output, '').to_s
        return nil if path.empty?

        File.expand_path(path, Dir.pwd)
      end

      def theme
        return :light if light?

        :dark
      end

      def caption?
        caption_options.present?
      end

      def caption_options_hash
        caption_options.to_h
      end

      def png_transparency
        return Export::PngExporter::ExportOptions::TRANSPARENT if raw_options.fetch(:transparent, true)

        Export::PngExporter::ExportOptions::OPAQUE
      end

      def dark?
        raw_options.fetch(:dark, false)
      end

      def light?
        raw_options.fetch(:light, false)
      end

      private

      attr_reader :caption_options, :raw_options
    end
  end
end
