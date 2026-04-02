# frozen_string_literal: true

module Qni
  module View
    # Base class for a fixed three-line text cell.
    class DrawElement
      # Top/bottom line style with an explicit connector character.
      class ConnectedLineStyle
        attr_reader :background

        def initialize(format: '%s', pad: ' ', background: ' ', connect: ' ')
          @format = format
          @pad = pad
          @background = background
          @connect = connect
        end

        def render(width)
          format % connect.center(width, pad)
        end

        private

        attr_reader :connect, :format, :pad
      end

      # Middle line style that renders the label itself.
      class MidLineStyle
        attr_reader :background

        def initialize(format: '%s', padding: ' ', background: ' ')
          @format = format
          @padding = padding
          @background = background
        end

        def render(label, width)
          format % label.center(width, padding)
        end

        private

        attr_reader :format, :padding
      end

      # Bundles the three display lines that make up a text cell.
      class CellStyle
        attr_reader :bot, :mid, :top

        def initialize(top:, mid:, bot:)
          @top = top
          @mid = mid
          @bot = bot
        end
      end

      DEFAULT_STYLE = CellStyle.new(
        top: ConnectedLineStyle.new,
        mid: MidLineStyle.new,
        bot: ConnectedLineStyle.new
      ).freeze

      attr_reader :layer_width

      def initialize(label = '', style: DEFAULT_STYLE, annotation_text: '')
        @label = label
        @annotation_text = annotation_text
        @layer_width = 0
        @style = style
      end

      def annotation
        annotation_text.center([layer_width, annotation_text.length].max, ' ')
      end

      def expand_to_layer(width)
        @layer_width = width
      end

      def top
        render_connected_line(style.top)
      end

      def mid
        middle_style = style.mid
        middle_style.render(label, width).center(layer_width, middle_style.background)
      end

      def bot
        render_connected_line(style.bot)
      end

      def length
        [annotation.length, top.length, mid.length, bot.length].max
      end

      def width
        label.length
      end

      private

      attr_reader :annotation_text, :label, :style

      def render_connected_line(line_style)
        line_style.render(width).center(layer_width, line_style.background)
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

      def self.style_for(format:, top_connect:, bot_connect:)
        DrawElement::CellStyle.new(
          top: DrawElement::ConnectedLineStyle.new(format: format[0], pad: '─', connect: top_connect),
          mid: DrawElement::MidLineStyle.new(format: format[1], background: '─'),
          bot: DrawElement::ConnectedLineStyle.new(format: format[2], pad: '─', connect: bot_connect)
        )
      end

      def initialize(label, format: STANDARD_FORMAT, top_connect: '─', bot_connect: '─', annotation_text: '')
        super(
          label,
          style: self.class.style_for(format:, top_connect:, bot_connect:),
          annotation_text:
        )
      end
    end

    # Boxed parameterized gate with its angle rendered above the box.
    class AngledBoxOnQuWire < BoxOnQuWire
      def initialize(label, angle_text, format: STANDARD_FORMAT, top_connect: '─', bot_connect: '─')
        super(label, format:, top_connect:, bot_connect:, annotation_text: angle_text)
      end

      def annotation
        return annotation_text if annotation_width == annotation_text_length

        annotation_text.rjust(annotation_text_length + left_annotation_padding)
                       .ljust(annotation_width)
      end

      private

      def annotation_width
        [layer_width, annotation_text_length].max
      end

      def left_annotation_padding
        padding = annotation_width - annotation_text_length
        [(padding / 2) + 1, padding].min
      end

      def annotation_text_length
        annotation_text.length
      end
    end

    # Unboxed element drawn directly on a wire.
    class DirectOnQuWire < DrawElement
      def self.style_for(top_connect:, bot_connect:)
        DrawElement::CellStyle.new(
          top: DrawElement::ConnectedLineStyle.new(format: ' %s ', connect: top_connect),
          mid: DrawElement::MidLineStyle.new(format: '─%s─', padding: '─', background: '─'),
          bot: DrawElement::ConnectedLineStyle.new(format: ' %s ', connect: bot_connect)
        )
      end

      def initialize(label, top_connect: ' ', bot_connect: ' ')
        super(label, style: self.class.style_for(top_connect:, bot_connect:))
      end
    end

    # Direct wire control bullet.
    class Bullet < DirectOnQuWire
      def initialize(top_connect: ' ', bot_connect: ' ')
        super('■', top_connect:, bot_connect:)
      end
    end

    # Direct wire swap marker.
    class Ex < DirectOnQuWire
      def initialize(top_connect: ' ', bot_connect: ' ')
        super('X', top_connect:, bot_connect:)
      end
    end

    # Vertical connector drawn on an otherwise empty wire.
    class VerticalBridge < DirectOnQuWire
      def initialize
        super('│', top_connect: '│', bot_connect: '│')
      end
    end

    # Plain empty quantum wire.
    class EmptyWire < DrawElement
      def initialize(wire = '─')
        super('', style: self.class.empty_wire_style(wire))
      end

      def self.empty_wire_style(wire)
        DrawElement::CellStyle.new(
          top: DrawElement::ConnectedLineStyle.new,
          mid: DrawElement::MidLineStyle.new(padding: wire, background: wire),
          bot: DrawElement::ConnectedLineStyle.new
        )
      end
    end
  end
end
