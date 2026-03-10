# frozen_string_literal: true

require 'json'
require_relative 'circuit'

module Qni
  class CircuitFile
    class Error < StandardError; end

    def initialize(path)
      @path = path
    end

    def add_gate!(gate:, step:, qubit:)
      with_domain_errors do
        circuit = load_or_initialize(step:, qubit:)
        circuit.add_gate!(gate:, step:, qubit:)
        write(circuit)
      end
    end

    private

    attr_reader :path

    def load_or_initialize(step:, qubit:)
      return Circuit.empty(step:, qubit:) unless File.exist?(path)

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
    rescue JSON::ParserError, Circuit::Error => e
      raise Error, e.message
    end
  end
end
