# frozen_string_literal: true

require 'json'
require 'open3'
require 'tmpdir'
require_relative 'simulator'

module Qni
  # Invokes the Python helper that renders Bloch-sphere PNG and APNG files.
  class BlochRenderer
    # Decodes the helper's stdout into the Ruby value expected by the caller.
    class OutputParser
      def initialize(format, stdout)
        @format = format
        @stdout = stdout
      end

      def parse
        return nil if %w[png apng].include?(format)
        return stdout.b if format == 'inline_png'
        return inline_frames if format == 'inline_frames'

        stdout
      end

      private

      attr_reader :format, :stdout

      def inline_frames
        JSON.parse(stdout).fetch('frames').map { |encoded_frame| encoded_frame.unpack1('m0').b }
      end
    end

    SETUP_MESSAGE = 'bloch rendering requires matplotlib and Pillow; run scripts/setup_symbolic_python.sh'
    HELPER_RELATIVE_PATH = '../../libexec/qni_bloch_render.py'
    REPO_RUNTIME_RELATIVE_PATH = '../../.python-symbolic/bin/python'
    TRAIL_VISIBILITY = {
      hidden: false,
      visible: true
    }.freeze
    HELPER_ENV = {
      'MPLCONFIGDIR' => File.join(Dir.tmpdir, 'qni-cli-matplotlib'),
      'UV_CACHE_DIR' => File.join(Dir.tmpdir, 'qni-cli-uv-cache')
    }.freeze

    def initialize(format:, output_path:, frames:, theme:, trail_visibility: :hidden)
      @request = {
        format:,
        output_path:,
        frames:,
        theme:,
        show_trail: TRAIL_VISIBILITY.fetch(trail_visibility)
      }
    end

    def render
      helper_commands.each do |command|
        result = run_with_helper(command)
        next if result == :retry_with_next_command

        return result
      end

      raise Simulator::Error, SETUP_MESSAGE
    end

    private

    attr_reader :request

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
        'format' => request.fetch(:format),
        'output_path' => request.fetch(:output_path),
        'frames' => request.fetch(:frames),
        'show_trail' => request.fetch(:show_trail),
        'theme' => request.fetch(:theme).to_s
      }
    end

    def repo_runtime_path
      File.expand_path(REPO_RUNTIME_RELATIVE_PATH, __dir__)
    end

    def run_with_helper(command)
      stdout, stderr, status = helper_result(command)
      return parsed_output(stdout) if status.success?

      handle_failed_helper(stderr, status)
    rescue Errno::ENOENT
      :retry_with_next_command
    end

    def helper_result(command)
      stdout, stderr, status = Open3.capture3(
        HELPER_ENV,
        *command,
        stdin_data: JSON.generate(payload)
      )
      [stdout, stderr, status]
    end

    def parsed_output(stdout)
      OutputParser.new(request.fetch(:format), stdout).parse
    end

    def handle_failed_helper(stderr, status)
      renderer_class = self.class
      return :retry_with_next_command if renderer_class.retryable_with_next_command?(stderr)

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
