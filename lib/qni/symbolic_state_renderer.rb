# frozen_string_literal: true

require 'json'
require 'open3'

module Qni
  # Invokes the Python symbolic helper for 1-qubit state rendering.
  class SymbolicStateRenderer
    ONE_QUBIT_ONLY_MESSAGE = 'symbolic run currently supports only 1-qubit circuits'
    HELPER_RELATIVE_PATH = '../../libexec/qni_symbolic_run.py'

    def initialize(circuit_hash)
      @circuit_hash = circuit_hash
    end

    def render
      raise Simulator::Error, ONE_QUBIT_ONLY_MESSAGE unless one_qubit?

      stdout, stderr, status = Open3.capture3(*command, stdin_data: JSON.generate(circuit_hash))
      raise Simulator::Error, render_error_message(stderr, status) unless status.success?

      stdout.strip
    rescue Errno::ENOENT => e
      raise Simulator::Error, e.message
    end

    private

    attr_reader :circuit_hash

    def one_qubit?
      circuit_hash.fetch('qubits') == 1
    end

    def command
      ['python3', helper_path]
    end

    def helper_path
      File.expand_path(HELPER_RELATIVE_PATH, __dir__)
    end

    def render_error_message(stderr, status)
      message = stderr.to_s.strip
      return message unless message.empty?

      "symbolic renderer failed with exit status #{status.exitstatus}"
    end
  end
end
