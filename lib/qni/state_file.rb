# frozen_string_literal: true

require 'fileutils'
require 'json'
require_relative 'circuit'
require_relative 'initial_state'

module Qni
  # Loads and saves only the initial-state portion of circuit.json.
  class StateFile
    # Raised when the state file contents cannot be loaded or persisted safely.
    class Error < StandardError; end

    def initialize(path)
      @path = path
    end

    def clear
      with_domain_errors do
        circuit = existing_circuit
        next unless circuit

        circuit.replace_initial_state(nil)
        write(circuit)
      end
    end

    def set(expression)
      with_domain_errors do
        circuit = existing_circuit || Circuit.empty(step: 0, qubit: 0)
        circuit.replace_initial_state(InitialState.parse(expression))
        write(circuit)
      end
    end

    def show
      with_domain_errors do
        circuit = existing_circuit
        default_state = InitialState.zero
        return default_state.to_s unless circuit

        (circuit.initial_state || default_state).to_s
      end
    end

    private

    attr_reader :path

    def existing_circuit
      return unless File.exist?(path)

      Circuit.from_h(JSON.parse(File.read(path)))
    end

    def write(circuit)
      temp_path = "#{path}.tmp"
      File.write(temp_path, "#{JSON.pretty_generate(circuit.to_h)}\n")
      File.rename(temp_path, path)
    ensure
      File.delete(temp_path) if temp_path && File.exist?(temp_path)
    end

    def with_domain_errors
      yield
    rescue JSON::ParserError, Circuit::Error, InitialState::Error => e
      raise Error, e.message
    end
  end
end
