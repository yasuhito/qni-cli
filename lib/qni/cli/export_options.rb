# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Normalizes and validates qni export CLI options.
    class ExportOptions
      def initialize(raw_options)
        @raw_options = raw_options
      end

      def validate
        validate_format_selection
        validate_theme_selection
        validate_state_vector_selection
        validate_output_path
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

      def output_path
        path = raw_options.fetch(:output, '').to_s
        return nil if path.empty?

        File.expand_path(path, Dir.pwd)
      end

      def theme
        return :light if light?

        :dark
      end

      private

      attr_reader :raw_options

      def dark?
        raw_options.fetch(:dark, false)
      end

      def light?
        raw_options.fetch(:light, false)
      end

      def validate_format_selection
        raise Thor::Error, 'choose exactly one of --latex-source or --png' unless latex_source? ^ png?
      end

      def validate_theme_selection
        raise Thor::Error, 'choose at most one of --dark or --light' if dark? && light?
      end

      def validate_state_vector_selection
        raise Thor::Error, '--state-vector currently supports only --png' if state_vector? && !png?
      end

      def validate_output_path
        raise Thor::Error, '--output=PATH is required for --png' if png? && !output_path
      end
    end
  end
end
