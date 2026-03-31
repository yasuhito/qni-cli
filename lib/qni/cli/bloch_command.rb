# frozen_string_literal: true

require_relative '../bloch_renderer'
require_relative '../bloch_inline_renderer'
require_relative '../bloch_sampler'

module Qni
  class CLI < Thor
    # Validates and executes qni bloch.
    class BlochCommand
      FILE_FORMATS = %i[png gif inline].freeze

      def initialize(circuit_file:, bloch_options:)
        @circuit_file = circuit_file
        @options = bloch_options
      end

      def execute
        validate_options

        return render_inline(sampled_frames) if inline_output?

        render_file(sampled_frames)
        nil
      end

      private

      attr_reader :circuit_file, :options

      def sampled_frames
        circuit = circuit_file.load
        BlochSampler.new(circuit.to_h).frames
      end

      def validate_options
        validate_format_selection
        validate_animate_option
        validate_theme_selection
        validate_output_path
      end

      def validate_format_selection
        return if FILE_FORMATS.one? { |name| option_enabled?(name) }

        raise Thor::Error, 'choose exactly one of --png, --gif, or --inline'
      end

      def validate_animate_option
        return unless option_enabled?(:animate) && !inline_output?

        raise Thor::Error, '--animate is supported only with --inline'
      end

      def validate_theme_selection
        return unless option_enabled?(:dark) && option_enabled?(:light)

        raise Thor::Error, 'choose at most one of --dark or --light'
      end

      def validate_output_path
        return validate_inline_output_path if inline_output?

        raise Thor::Error, '--output is required' if output_path_missing?
      end

      def validate_inline_output_path
        raise Thor::Error, '--output is not supported with --inline' if output_path_present?
      end

      def output_path
        options[:output]
      end

      def option_enabled?(name)
        options[name]
      end

      def output_path_present?
        !output_path.to_s.empty?
      end

      def output_path_missing?
        !output_path_present?
      end

      def inline_output?
        option_enabled?(:inline)
      end

      def format
        option_enabled?(:gif) ? 'gif' : 'png'
      end

      def theme
        option_enabled?(:light) ? :light : :dark
      end

      def render_file(frames)
        BlochRenderer.new(format:, output_path:, frames:, theme:).render
      end

      def render_inline(frames)
        renderer = BlochInlineRenderer.new(frames:, theme:)
        return renderer.render_animation if option_enabled?(:animate)

        renderer.render_static
      end
    end
  end
end
