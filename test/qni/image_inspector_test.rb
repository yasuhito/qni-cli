# frozen_string_literal: true

require 'minitest/autorun'
require 'tmpdir'
require_relative '../../lib/qni/bloch_renderer'
require_relative '../../lib/qni/image_inspector'

module Qni
  class ImageInspectorTest < Minitest::Test
    def test_png_metadata_reports_size_and_alpha
      with_rendered_file(format: 'png') do |output_path|
        inspector = ImageInspector.new(output_path, python_runtime: python_runtime)

        assert inspector.png?
        refute inspector.animated_png?
        assert inspector.transparent_png?
        assert_equal [512, 512], inspector.dimensions
      end
    end

    def test_apng_metadata_reports_animation_frames
      with_rendered_file(format: 'apng') do |output_path|
        inspector = ImageInspector.new(output_path, python_runtime: python_runtime)

        assert inspector.png?
        assert inspector.animated_png?
        assert_operator inspector.frame_count, :>, 1
      end
    end

    private

    def sample_frames
      [
        { 'vector' => [0.0, 0.0, 1.0] },
        { 'vector' => [1.0, 0.0, 0.0] }
      ]
    end

    def python_runtime
      File.expand_path('../../.python-symbolic/bin/python', __dir__)
    end

    def with_rendered_file(format:)
      Dir.mktmpdir do |dir|
        output_path = File.join(dir, 'image.png')
        BlochRenderer.new(format:, output_path:, frames: sample_frames, theme: :dark).render
        yield output_path
      end
    end
  end
end
