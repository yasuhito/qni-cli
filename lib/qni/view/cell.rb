# frozen_string_literal: true

module Qni
  module View
    # Base class for a fixed three-line text cell.
    class DrawElement
      attr_accessor :layer_width

      def initialize(label = '')
        @label = label
        @width = nil
        @layer_width = 0
        @top_format = @mid_format = @bot_format = '%s'
        @top_connect = @bot_connect = ' '
        @top_pad = @mid_padding = @bot_pad = ' '
        @top_bck = @mid_bck = @bot_bck = ' '
      end

      def top
        render_line(top_format, top_connect, top_pad, top_bck)
      end

      def mid
        rendered = mid_format % label.center(width, mid_padding)
        rendered.center(layer_width, mid_bck)
      end

      def bot
        render_line(bot_format, bot_connect, bot_pad, bot_bck)
      end

      def length
        [top.length, mid.length, bot.length].max
      end

      def width
        @width || label.length
      end

      private

      attr_reader :bot_bck, :bot_connect, :bot_format, :bot_pad, :label, :mid_bck, :mid_format,
                  :mid_padding, :top_bck, :top_connect, :top_format, :top_pad

      def render_line(format, connect, pad, background)
        rendered = format % connect.center(width, pad)
        rendered.center(layer_width, background)
      end
    end

    # Boxed quantum gate cell.
    class BoxOnQuWire < DrawElement
      COMPACT_LABEL_PATTERN = /\A[A-Z][xyz†]\z/u
      LEADING_COMPACT_LABEL_PATTERN = /\A√[A-Z]\z/u
      STANDARD_FORMAT = ['┌─%s─┐', '┤ %s ├', '└─%s─┘'].freeze
      COMPACT_FORMAT = ['┌─%s┐', '┤ %s├', '└─%s┘'].freeze
      LEADING_COMPACT_FORMAT = ['┌─%s┐', '┤%s ├', '└─%s┘'].freeze

      def self.build(label, top_connect: '─', bot_connect: '─')
        new(label, format: format_for(label), top_connect:, bot_connect:)
      end

      def self.format_for(label)
        return COMPACT_FORMAT if COMPACT_LABEL_PATTERN.match?(label)
        return LEADING_COMPACT_FORMAT if LEADING_COMPACT_LABEL_PATTERN.match?(label)

        STANDARD_FORMAT
      end

      def initialize(label, format: STANDARD_FORMAT, top_connect: '─', bot_connect: '─')
        super(label)
        @top_format, @mid_format, @bot_format = format
        @top_pad = @mid_bck = @bot_pad = '─'
        @top_connect = top_connect
        @bot_connect = bot_connect
      end
    end

    # Unboxed element drawn directly on a wire.
    class DirectOnQuWire < DrawElement
      def initialize(label)
        super
        @top_format = ' %s '
        @mid_format = '─%s─'
        @bot_format = ' %s '
        @mid_padding = @mid_bck = '─'
      end
    end

    # Direct wire control bullet.
    class Bullet < DirectOnQuWire
      def initialize(top_connect: ' ', bot_connect: ' ')
        super('■')
        @top_connect = top_connect
        @bot_connect = bot_connect
      end
    end

    # Direct wire swap marker.
    class Ex < DirectOnQuWire
      def initialize(top_connect: ' ', bot_connect: ' ')
        super('X')
        @top_connect = top_connect
        @bot_connect = bot_connect
      end
    end

    # Vertical connector drawn on an otherwise empty wire.
    class VerticalBridge < DirectOnQuWire
      def initialize
        super('│')
        @top_connect = '│'
        @bot_connect = '│'
      end
    end

    # Plain empty quantum wire.
    class EmptyWire < DrawElement
      def initialize(wire = '─')
        super
        @mid_padding = @mid_bck = wire
      end
    end
  end
end
