# frozen_string_literal: true

require 'json'
require 'open3'
require 'tmpdir'

module Qni
  # Invokes the Python helper that renders Bloch-sphere PNG and GIF files.
  class BlochRenderer
    SETUP_MESSAGE = 'bloch rendering requires matplotlib and Pillow; run scripts/setup_symbolic_python.sh'
    HELPER_RELATIVE_PATH = '../../libexec/qni_bloch_render.py'
    REPO_RUNTIME_RELATIVE_PATH = '../../.python-symbolic/bin/python'
    HELPER_ENV = {
      'MPLCONFIGDIR' => File.join(Dir.tmpdir, 'qni-cli-matplotlib'),
      'UV_CACHE_DIR' => File.join(Dir.tmpdir, 'qni-cli-uv-cache')
    }.freeze

    def initialize(format:, output_path:, frames:, theme:)
      @format = format
      @output_path = output_path
      @frames = frames
      @theme = theme
    end

    def render
      return if helper_commands.any? { |command| run_with_helper(command) }

      raise Simulator::Error, SETUP_MESSAGE
    end

    private

    attr_reader :format, :frames, :output_path, :theme

    def helper_commands
      [
        [repo_runtime_path, helper_path],
        ['python3', helper_path]
      ]
    end

    def helper_path
      File.expand_path(HELPER_RELATIVE_PATH, __dir__)
    end

    def payload
      {
        'format' => format,
        'output_path' => output_path,
        'frames' => frames,
        'theme' => theme.to_s
      }
    end

    def repo_runtime_path
      File.expand_path(REPO_RUNTIME_RELATIVE_PATH, __dir__)
    end

    def run_with_helper(command)
      stderr, status = helper_result(command)
      return true if status.success?

      handle_failed_helper(stderr, status)
    rescue Errno::ENOENT
      nil
    end

    def helper_result(command)
      _stdout, stderr, status = Open3.capture3(
        HELPER_ENV,
        *command,
        stdin_data: JSON.generate(payload)
      )
      [stderr, status]
    end

    def handle_failed_helper(stderr, status)
      renderer_class = self.class
      return nil if renderer_class.retryable_with_next_command?(stderr)

      raise Simulator::Error, renderer_class.helper_error_message(stderr, status)
    end

    class << self
      def helper_error_message(stderr, status)
        message = stderr.to_s.strip
        return "bloch renderer failed with exit status #{status.exitstatus}" if message.empty?

        message
      end

      def retryable_with_next_command?(stderr)
        message = stderr.to_s
        message.include?("No module named 'matplotlib'") ||
          message.include?("No module named 'PIL'")
      end
    end
  end
end
