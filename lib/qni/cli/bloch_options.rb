# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Encapsulates qni bloch option validation and derived render settings.
    class BlochOptions
      # Validates combinations of qni bloch command-line options.
      class Validator
        FILE_FORMATS = %i[png apng inline].freeze

        def initialize(options)
          @options = options
        end

        def validate
          validate_format_selection
          validate_animate_option
          validate_theme_selection
          validate_output_path
        end

        private

        attr_reader :options

        def output_path_present?
          !options.output_path.to_s.empty?
        end

        def validate_animate_option
          return unless options.animate? && !options.inline_output?

          raise Thor::Error, '--animate is supported only with --inline'
        end

        def validate_format_selection
          return if FILE_FORMATS.one? { |name| options.option_enabled?(name) }

          raise Thor::Error, 'choose exactly one of --png, --apng, or --inline'
        end

        def validate_inline_output_path
          raise Thor::Error, '--output is not supported with --inline' if output_path_present?
        end

        def validate_output_path
          return validate_inline_output_path if options.inline_output?

          raise Thor::Error, '--output is required' unless output_path_present?
        end

        def validate_theme_selection
          return unless options.option_enabled?(:dark) && options.option_enabled?(:light)

          raise Thor::Error, 'choose at most one of --dark or --light'
        end
      end

      def initialize(options)
        @options = options
      end

      def option_enabled?(name)
        options[name]
      end

      def validate
        Validator.new(self).validate
      end

      def animate?
        option_enabled?(:animate)
      end

      def format
        option_enabled?(:apng) ? 'apng' : 'png'
      end

      def inline_output?
        option_enabled?(:inline)
      end

      def interpolation_mode
        trajectory_enabled? ? :trajectory : :gates_only
      end

      def output_path
        options[:output]
      end

      def theme
        option_enabled?(:light) ? :light : :dark
      end

      def trail_visibility
        trajectory_enabled? ? :visible : :hidden
      end

      private

      attr_reader :options

      def trajectory_enabled?
        option_enabled?(:trajectory)
      end
    end
  end
end
