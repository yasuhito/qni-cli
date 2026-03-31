# frozen_string_literal: true

require_relative '../bloch_renderer'
require_relative '../bloch_sampler'

module Qni
  class CLI < Thor
    # Validates and executes qni bloch.
    class BlochCommand
      def initialize(circuit_file:, bloch_options:)
        @circuit_file = circuit_file
        @options = bloch_options
      end

      def execute
        validate_options

        circuit = circuit_file.load
        frames = BlochSampler.new(circuit.to_h).frames
        BlochRenderer.new(format:, output_path:, frames:, theme:).render
        nil
      end

      private

      attr_reader :circuit_file, :options

      def validate_options
        validate_format_selection
        validate_theme_selection
        validate_output_path
      end

      def validate_format_selection
        return if png? ^ gif?

        raise Thor::Error, 'choose exactly one of --png or --gif'
      end

      def validate_theme_selection
        return unless dark? && light?

        raise Thor::Error, 'choose at most one of --dark or --light'
      end

      def validate_output_path
        return unless output_path.to_s.empty?

        raise Thor::Error, '--output is required'
      end

      def dark?
        options[:dark]
      end

      def gif?
        options[:gif]
      end

      def light?
        options[:light]
      end

      def output_path
        options[:output]
      end

      def format
        gif? ? 'gif' : 'png'
      end

      def png?
        options[:png]
      end

      def theme
        light? ? :light : :dark
      end
    end
  end
end
