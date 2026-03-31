# frozen_string_literal: true

require 'minitest/autorun'
require 'open3'
require 'tmpdir'
require_relative '../../lib/qni/bloch_renderer'

module Qni
  class BlochRendererTest < Minitest::Test
    def test_apng_writes_animated_png_file
      with_rendered_file(format: 'apng') do |output_path|
        file_output, file_status = Open3.capture2('file', output_path)
        assert file_status.success?, 'expected file command to succeed'
        assert_includes file_output, 'animated'
      end
    end

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

    def with_rendered_file(format:)
      Dir.mktmpdir do |dir|
        output_path = File.join(dir, 'bloch.png')
        BlochRenderer.new(format:, output_path:, frames: sample_frames, theme: :dark).render

        assert File.exist?(output_path), "expected #{format} output file to exist"
        yield output_path
      end
    end
  end
end
