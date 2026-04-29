# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Validates qni export option combinations.
    class ExportOptionsValidator
      def initialize(options, caption_options)
        @options = options
        @caption_options = caption_options
      end

      def validate
        validators.each(&:call)
      end

      private

      attr_reader :caption_options, :options

      def validators
        [
          method(:validate_special_png_modes),
          method(:validate_format_selection),
          method(:validate_theme_selection),
          method(:validate_special_mode_exclusivity),
          caption_options.method(:validate),
          method(:validate_output_path)
        ]
      end

      def validate_format_selection
        raise Thor::Error, 'choose exactly one of --latex-source or --png' unless options.latex_source? ^ options.png?
      end

      def validate_theme_selection
        raise Thor::Error, 'choose at most one of --dark or --light' if options.dark? && options.light?
      end

      def validate_special_png_modes
        return if options.png?

        raise Thor::Error, '--state-vector currently supports only --png' if options.state_vector?
        raise Thor::Error, '--circle-notation currently supports only --png' if options.circle_notation?
      end

      def validate_special_mode_exclusivity
        return unless options.state_vector? && options.circle_notation?

        raise Thor::Error, 'choose at most one of --state-vector or --circle-notation'
      end

      def validate_output_path
        raise Thor::Error, '--output=PATH is required for --png' if options.png? && !options.output_path
      end
    end
  end
end
