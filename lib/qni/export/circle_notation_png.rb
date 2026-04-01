# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'open3'
require 'tmpdir'
require_relative '../simulator'

module Qni
  module Export
    # Invokes the Python helper that renders computational-basis circle-notation PNG files.
    class CircleNotationPng
      SETUP_MESSAGE = 'circle-notation rendering requires matplotlib and Pillow; run scripts/setup_symbolic_python.sh'
      HELPER_RELATIVE_PATH = '../../../libexec/qni_circle_notation_render.py'
      REPO_RUNTIME_RELATIVE_PATH = '../../../.python-symbolic/bin/python'
      HELPER_ENV = {
        'MPLCONFIGDIR' => File.join(Dir.tmpdir, 'qni-cli-matplotlib'),
        'UV_CACHE_DIR' => File.join(Dir.tmpdir, 'qni-cli-uv-cache')
      }.freeze

      def initialize(state_vector:, output_path:, theme:)
        @state_vector = state_vector
        @output_path = output_path
        @theme = theme
      end

      def export
        FileUtils.mkdir_p(File.dirname(output_path))
        result = render_with_helper_commands
        return if result == :file_rendered
        return result if result

        raise Simulator::Error, SETUP_MESSAGE
      end

      private

      attr_reader :output_path, :state_vector, :theme

      def helper_commands
        [
          [repo_runtime_path, helper_path],
          ['python3', helper_path]
        ]
      end

      def helper_path
        File.expand_path(HELPER_RELATIVE_PATH, __dir__)
      end

      def repo_runtime_path
        File.expand_path(REPO_RUNTIME_RELATIVE_PATH, __dir__)
      end

      def payload
        state_vector.export_payload.merge(
          'output_path' => output_path,
          'theme' => theme.to_s
        )
      end

      def run_with_helper(command)
        _stdout, stderr, status = Open3.capture3(
          HELPER_ENV,
          *command,
          stdin_data: JSON.generate(payload)
        )
        return :file_rendered if status.success?

        handle_failed_helper(stderr, status)
      rescue Errno::ENOENT
        :retry_with_next_command
      end

      def render_with_helper_commands
        helper_commands.each do |command|
          result = run_with_helper(command)
          return result unless result == :retry_with_next_command
        end

        nil
      end

      def handle_failed_helper(stderr, status)
        renderer_class = self.class
        return :retry_with_next_command if renderer_class.retryable_with_next_command?(stderr)

        raise Simulator::Error, renderer_class.helper_error_message(stderr, status)
      end

      class << self
        def helper_error_message(stderr, status)
          message = stderr.to_s.strip
          return "circle-notation renderer failed with exit status #{status.exitstatus}" if message.empty?

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
end
