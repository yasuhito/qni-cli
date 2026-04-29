# frozen_string_literal: true

require_relative '../export/qcircuit_caption'

module Qni
  class CLI < Thor
    # Normalizes and validates caption-related qni export CLI options.
    class ExportCaptionOptions
      def initialize(raw_options)
        @raw_options = raw_options
      end

      def validate
        validate_mode
        validate_position
        validate_size
      end

      def text
        raw_options.fetch(:caption, nil)
      end

      def present?
        !text.to_s.empty?
      end

      def position
        raw_options.fetch(:caption_position, Export::QCircuitCaption::DEFAULT_POSITION)
      end

      def size
        raw_options.fetch(:caption_size, Export::QCircuitCaption::DEFAULT_SIZE_PT).to_i
      end

      def format
        return :tex if raw_options.fetch(:caption_tex, false)

        :text
      end

      def to_h
        {
          caption: text,
          caption_position: position,
          caption_size: size,
          caption_format: format
        }
      end

      private

      attr_reader :raw_options

      def validate_mode
        return if text.to_s.empty?
        return unless raw_options.fetch(:state_vector, false) || raw_options.fetch(:circle_notation, false)

        raise Thor::Error, '--caption is supported only for regular circuit export'
      end

      def validate_position
        return if Export::QCircuitCaption.valid_position?(position)

        raise Thor::Error, '--caption-position must be top or bottom'
      end

      def validate_size
        return if size.positive?

        raise Thor::Error, '--caption-size must be positive'
      end
    end
  end
end
