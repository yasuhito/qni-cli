# frozen_string_literal: true

require 'json'
require 'open3'
require 'tmpdir'

module Qni
  # Invokes the Python symbolic helper for small symbolic state rendering.
  class SymbolicStateRenderer
    SUPPORTED_QUBIT_MESSAGE = 'symbolic run currently supports only 1-qubit and 2-qubit circuits'
    SETUP_MESSAGE = 'symbolic run requires SymPy runtime; run scripts/setup_symbolic_python.sh'
    HELPER_RELATIVE_PATH = '../../libexec/qni_symbolic_run.py'
    REPO_RUNTIME_RELATIVE_PATH = '../../.python-symbolic/bin/python'
    HELPER_ENV = { 'UV_CACHE_DIR' => File.join(Dir.tmpdir, 'qni-cli-uv-cache') }.freeze

    def initialize(circuit_hash, basis: nil)
      @circuit_hash = circuit_hash
      @basis = basis
    end

    def render
      render_with_format('text')
    end

    def render_latex_formula
      render_with_format('latex')
    end

    private

    def render_with_format(format)
      if %w[x y].include?(basis) && circuit_hash.fetch('qubits') != 1
        raise Simulator::Error, "symbolic #{basis}-basis run currently supports only 1-qubit circuits"
      end

      raise Simulator::Error, SUPPORTED_QUBIT_MESSAGE unless supported_qubit_count?

      args = ['--format', format]
      args.push('--basis', basis) if basis
      render_with_helpers(*args)
    end

    attr_reader :basis, :circuit_hash

    def supported_qubit_count?
      [1, 2].include?(circuit_hash.fetch('qubits'))
    end

    def helper_commands(*args)
      [
        [repo_runtime_path, helper_path, *args],
        ['python3', helper_path, *args],
        ['uv', 'run', '--quiet', '--with', 'sympy', 'python3', helper_path, *args]
      ]
    end

    def helper_path
      File.expand_path(HELPER_RELATIVE_PATH, __dir__)
    end

    def repo_runtime_path
      File.expand_path(REPO_RUNTIME_RELATIVE_PATH, __dir__)
    end

    def render_with_helpers(...)
      helper_commands(...).each do |command|
        output = render_with_helper(command)
        return output if output
      end

      raise Simulator::Error, SETUP_MESSAGE
    end

    def render_with_helper(command)
      stdout, stderr, status = run_helper(command)
      return stdout if status.success?

      handle_failed_helper(command, stderr, status)
    rescue Errno::ENOENT
      nil
    end

    def handle_failed_helper(command, stderr, status)
      helper_class = self.class
      return nil if helper_class.retryable_with_next_command?(stderr, command)

      raise Simulator::Error, helper_class.render_error_message(stderr, status)
    end

    def run_helper(command)
      stdout, stderr, status = Open3.capture3(
        HELPER_ENV,
        *command,
        stdin_data: JSON.generate(circuit_hash)
      )
      [stdout.strip, stderr, status]
    end

    class << self
      def retryable_with_next_command?(stderr, command)
        executable = command.first
        message = stderr.to_s
        (executable == 'uv' && message.include?('Failed to fetch:')) ||
          (executable == 'python3' && message.include?("No module named 'sympy'"))
      end

      def render_error_message(stderr, status)
        message = stderr.to_s.strip
        return message unless message.empty?

        "symbolic renderer failed with exit status #{status.exitstatus}"
      end
    end
  end
end
