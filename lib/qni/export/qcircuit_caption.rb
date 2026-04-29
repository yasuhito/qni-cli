# frozen_string_literal: true

module Qni
  module Export
    # Renders a plain-text caption inside the qcircuit LaTeX document.
    class QCircuitCaption
      DEFAULT_POSITION = 'bottom'
      DEFAULT_SIZE_PT = 12
      LATEX_ESCAPE_MAP = {
        '\\' => '\\textbackslash{}',
        '{' => '\\{',
        '}' => '\\}',
        '$' => '\\$',
        '&' => '\\&',
        '%' => '\\%',
        '#' => '\\#',
        '_' => '\\_',
        '^' => '\\textasciicircum{}',
        '~' => '\\textasciitilde{}',
        '·' => '$\\cdot$',
        '⊗' => '$\\otimes$',
        'π' => '$\\pi$'
      }.freeze

      def initialize(text:, position: DEFAULT_POSITION, size_pt: DEFAULT_SIZE_PT, format: :text)
        @text = text.to_s
        @position = position.to_s
        @size_pt = size_pt.to_i
        @format = format
      end

      def present?
        !text.empty?
      end

      def position_top?
        position == 'top'
      end

      def position_bottom?
        position == 'bottom'
      end

      def lines
        return [] unless present?

        ["{\\fontsize{#{size_pt}}{#{line_height_pt}}\\selectfont #{escaped_text}}"]
      end

      def self.from_options(options)
        new(
          text: options.fetch(:caption, nil),
          position: options.fetch(:caption_position, DEFAULT_POSITION),
          size_pt: options.fetch(:caption_size, DEFAULT_SIZE_PT),
          format: options.fetch(:caption_format, :text)
        )
      end

      def self.valid_position?(position)
        %w[top bottom].include?(position.to_s)
      end

      private

      attr_reader :position, :size_pt, :text

      def tex?
        @format == :tex
      end

      def line_height_pt
        (size_pt * 1.25).ceil
      end

      def escaped_text
        return text if tex?

        text.each_char.map { |char| LATEX_ESCAPE_MAP.fetch(char, char) }.join
      end
    end
  end
end
