# frozen_string_literal: true

require 'json'
require 'open3'
require 'tmpdir'

module Qni
  # Invokes the Python symbolic helper for small symbolic state rendering.
  class SymbolicStateRenderer
    SUPPORTED_QUBIT_MESSAGE = 'symbolic run currently supports only 1-qubit and 2-qubit circuits'
    HELPER_RELATIVE_PATH = '../../libexec/qni_symbolic_run.py'

    def initialize(circuit_hash)
      @circuit_hash = circuit_hash
    end

    def render
      raise Simulator::Error, SUPPORTED_QUBIT_MESSAGE unless supported_qubit_count?

      render_with_helpers || raise(Simulator::Error, 'symbolic run requires Python with SymPy or uv')
    rescue Errno::ENOENT => e
      raise Simulator::Error, e.message
    end

    private

    attr_reader :circuit_hash

    def supported_qubit_count?
      [1, 2].include?(circuit_hash.fetch('qubits'))
    end

    def helper_commands
      [
        ['python3', helper_path],
        ['uv', 'run', '--quiet', '--with', 'sympy', 'python3', helper_path]
      ]
    end

    def helper_path
      File.expand_path(HELPER_RELATIVE_PATH, __dir__)
    end

    def render_with_helpers
      helper_commands.each do |command|
        output = render_with_helper(command)
        return output if output
      end

      nil
    end

    def render_with_helper(command)
      stdout, stderr, status = run_helper(command)
      return stdout if status.success?

      helper_class = self.class
      return nil if helper_class.retryable_with_next_command?(stderr, command)

      raise Simulator::Error, helper_class.render_error_message(stderr, status)
    end

    def run_helper(command)
      stdout, stderr, status = Open3.capture3(
        helper_env,
        *command,
        stdin_data: JSON.generate(circuit_hash)
      )
      [stdout.strip, stderr, status]
    end

    def helper_env
      { 'UV_CACHE_DIR' => File.join(Dir.tmpdir, 'qni-cli-uv-cache') }
    end

    class << self
      def retryable_with_next_command?(stderr, command)
        return false unless command.first == 'python3'

        stderr.to_s.include?("No module named 'sympy'")
      end

      def render_error_message(stderr, status)
        message = stderr.to_s.strip
        return message unless message.empty?

        "symbolic renderer failed with exit status #{status.exitstatus}"
      end
    end
  end
end
