# frozen_string_literal: true

require 'json'
require 'open3'

module Qni
  # Reads basic image metadata through Pillow so test helpers do not rely on
  # host-specific tools like ImageMagick or `file`.
  class ImageInspector
    def initialize(path, python_runtime: 'python3')
      @path = path
      @python_runtime = python_runtime
    end

    def png?
      metadata.fetch('format') == 'PNG'
    end

    def gif?
      metadata.fetch('format') == 'GIF'
    end

    def animated_png?
      png? && frame_count > 1
    end

    def transparent_png?
      png? && metadata.fetch('has_alpha')
    end

    def frame_count
      metadata.fetch('frame_count')
    end

    def dimensions
      [metadata.fetch('width'), metadata.fetch('height')]
    end

    private

    attr_reader :path, :python_runtime

    def metadata
      @metadata ||= begin
        output, status = Open3.capture2(python_runtime, '-c', pillow_script, path)
        raise "python image inspection failed for: #{path}" unless status.success?

        JSON.parse(output)
      end
    end

    def pillow_script
      <<~PYTHON
        from PIL import Image
        import json
        import sys

        image = Image.open(sys.argv[1])
        print(json.dumps({
          "format": image.format,
          "width": image.size[0],
          "height": image.size[1],
          "frame_count": getattr(image, "n_frames", 1),
          "has_alpha": ("A" in image.getbands()) or ("transparency" in image.info)
        }))
      PYTHON
    end
  end
end
