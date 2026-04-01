# frozen_string_literal: true

require_relative 'bloch_renderer'
require_relative 'kitty_graphics_emitter'
require_relative 'simulator'

module Qni
  # Renders Bloch sphere previews directly into Kitty-compatible terminals.
  class BlochInlineRenderer
    UNSUPPORTED_TERMINAL_MESSAGE =
      'inline bloch rendering requires a Kitty-compatible terminal; use --png or --apng instead'
    TRAIL_VISIBILITY = {
      hidden: false,
      visible: true
    }.freeze

    def initialize(frames:, theme:, trail_visibility: :hidden, io: $stdout, env: ENV)
      @render_options = {
        frames:,
        theme:,
        show_trail: TRAIL_VISIBILITY.fetch(trail_visibility)
      }
      @io = io
      @env = env
    end

    def render_animation
      ensure_supported_terminal
      KittyGraphicsEmitter.new(io:).emit_animation(animated_png_frames)
      nil
    end

    def render_static
      ensure_supported_terminal
      KittyGraphicsEmitter.new(io:).emit_png_frame(static_png_frame)
      nil
    end

    private

    attr_reader :env, :io, :render_options

    def animated_png_frames
      BlochRenderer.new(
        format: 'inline_frames',
        output_path: nil,
        frames:,
        theme:,
        trail_visibility:
      ).render
    end

    def force_inline?
      env['QNI_TEST_FORCE_INLINE'] == '1'
    end

    def ghostty_terminal?
      env['TERM_PROGRAM'].to_s.casecmp('ghostty').zero? ||
        env['TERM'].to_s.include?('ghostty')
    end

    def kitty_terminal?
      env.key?('KITTY_WINDOW_ID') || env['TERM'].to_s.include?('kitty')
    end

    def static_png_frame
      BlochRenderer.new(
        format: 'inline_png',
        output_path: nil,
        frames:,
        theme:,
        trail_visibility:
      ).render
    end

    def supported_terminal?
      io.tty? && (ghostty_terminal? || kitty_terminal?)
    end

    def frames
      render_options.fetch(:frames)
    end

    def theme
      render_options.fetch(:theme)
    end

    def trail_visibility
      render_options.fetch(:show_trail) ? :visible : :hidden
    end

    def ensure_supported_terminal
      return if force_inline?
      return if supported_terminal?

      raise Simulator::Error, UNSUPPORTED_TERMINAL_MESSAGE
    end
  end
end
