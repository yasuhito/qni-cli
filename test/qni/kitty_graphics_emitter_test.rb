# frozen_string_literal: true

require 'minitest/autorun'
require 'stringio'

module Qni
  class KittyGraphicsEmitterTest < Minitest::Test
    def test_static_image_emits_single_kitty_graphics_payload
      require_relative '../../lib/qni/kitty_graphics_emitter'

      io = StringIO.new
      KittyGraphicsEmitter.new(io:).emit_png_frame('png-bytes')

      output = io.string

      assert_includes output, "\e_G"
      assert_includes output, "\e\\"
      assert_includes output, 'a=T'
    end

    def test_animation_emits_multiple_frames
      require_relative '../../lib/qni/kitty_graphics_emitter'

      io = StringIO.new
      KittyGraphicsEmitter.new(io:).emit_animation(%w[frame-1 frame-2])

      assert_operator io.string.scan("\e_G").length, :>=, 2
    end

    def test_large_image_sets_more_chunks_flag_until_last_chunk
      require_relative '../../lib/qni/kitty_graphics_emitter'

      io = StringIO.new
      KittyGraphicsEmitter.new(io:).emit_png_frame('a' * 4000)

      payloads = io.string.split("\e\\").reject(&:empty?)

      assert_operator payloads.length, :>=, 2
      assert_match(/m=1;/, payloads.first)
      assert_match(/m=0;/, payloads.last)
    end
  end
end
