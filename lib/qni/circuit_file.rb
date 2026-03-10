# frozen_string_literal: true

require 'json'
require_relative 'circuit'

module Qni
  # Loads and saves circuit.json while translating file errors into domain errors.
  class CircuitFile
    # Raised when circuit file contents cannot be loaded or persisted safely.
    class Error < StandardError; end

    def initialize(path)
      @path = path
    end

    def add_gate(gate:, step:, qubit:)
      with_domain_errors do
        circuit = load_or_initialize(step:, max_qubit: qubit)
        circuit.add_gate(gate:, step:, qubit:)
        write(circuit)
      end
    end

    def add_controlled_gate(step:, controlled_gate:)
      with_domain_errors do
        circuit = load_or_initialize(step:, max_qubit: controlled_gate.symbols.keys.max)
        circuit.add_controlled_gate(step:, controlled_gate:)
        write(circuit)
      end
    end

    def load
      with_domain_errors do
        raise Error, 'circuit.json does not exist' unless File.exist?(path)

        Circuit.from_h(JSON.parse(File.read(path)))
      end
    end

    private

    attr_reader :path

    def load_or_initialize(step:, max_qubit:)
      return Circuit.empty(step:, qubit: max_qubit) unless File.exist?(path)

      load
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
    rescue JSON::ParserError, Circuit::Error => e
      raise Error, e.message
    end
  end
end
