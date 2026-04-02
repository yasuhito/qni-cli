# frozen_string_literal: true

require_relative 'bloch_options'
require_relative '../bloch_renderer'
require_relative '../bloch_inline_renderer'
require_relative '../bloch_sampler'

module Qni
  class CLI < Thor
    # Validates and executes qni bloch.
    class BlochCommand
      def initialize(circuit_file:, bloch_options:)
        @circuit_file = circuit_file
        @bloch_options = BlochOptions.new(bloch_options)
      end

      def execute
        bloch_options.validate

        return render_inline(sampled_frames) if inline_output?

        render_file(sampled_frames)
        nil
      end

      private

      attr_reader :bloch_options, :circuit_file

      def sampled_frames
        circuit = circuit_file.load
        BlochSampler.new(circuit.to_h, interpolation: bloch_options.interpolation_mode).frames
      end

      def inline_output?
        bloch_options.inline_output?
      end

      def render_file(frames)
        BlochRenderer.new(
          format: bloch_options.format,
          output_path: bloch_options.output_path,
          frames:,
          theme: bloch_options.theme,
          trail_visibility: bloch_options.trail_visibility
        ).render
      end

      def render_inline(frames)
        renderer = BlochInlineRenderer.new(
          frames:,
          theme: bloch_options.theme,
          trail_visibility: bloch_options.trail_visibility
        )
        return renderer.render_animation if bloch_options.animate?

        renderer.render_static
      end
    end
  end
end
