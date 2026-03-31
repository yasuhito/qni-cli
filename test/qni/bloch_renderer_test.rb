# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/bloch_renderer'

module Qni
  class BlochRendererTest < Minitest::Test
    def test_inline_png_returns_binary_png_data
      png_bytes = BlochRenderer.new(
        format: 'inline_png',
        output_path: nil,
        frames: sample_frames.first(1),
        theme: :dark
      ).render

      assert_equal "\x89PNG".b, png_bytes.byteslice(0, 4)
    end

    def test_inline_frames_returns_multiple_png_frames
      frames = BlochRenderer.new(
        format: 'inline_frames',
        output_path: nil,
        frames: sample_frames,
        theme: :dark
      ).render

      assert_operator frames.length, :>=, 2
      assert_equal "\x89PNG".b, frames.first.byteslice(0, 4)
    end

    private

    def sample_frames
      [
        { 'vector' => [0.0, 0.0, 1.0] },
        { 'vector' => [1.0, 0.0, 0.0] }
      ]
    end
  end
end
