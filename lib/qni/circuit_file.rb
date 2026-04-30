# frozen_string_literal: true

require 'fileutils'
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
        circuit = existing_circuit || Circuit.empty(step:, qubit:)
        circuit.add_gate(gate:, step:, qubit:)
        write(circuit)
      end
    end

    def add_controlled_gate(step:, controlled_gate:)
      with_domain_errors do
        circuit = existing_circuit || Circuit.empty(step:, qubit: controlled_gate.symbols.keys.max)
        circuit.add_controlled_gate(step:, controlled_gate:)
        write(circuit)
      end
    end

    def add_swap_gate(step:, targets:)
      with_domain_errors do
        circuit = existing_circuit || Circuit.empty(step:, qubit: targets.max)
        circuit.add_swap_gate(step:, targets:)
        write(circuit)
      end
    end

    def load
      with_domain_errors { existing_circuit || raise(Error, 'circuit.json does not exist') }
    end

    def clear
      with_domain_errors do
        FileUtils.rm_f(path)
      end
    end

    def clear_variables
      update_existing_circuit(&:clear_variables)
    end

    def set_variable(name:, value:)
      update_required_circuit do |circuit|
        circuit.set_variable(name:, value:)
      end
    end

    def unset_variable(name:)
      update_existing_circuit do |circuit|
        circuit.unset_variable(name:)
      end
    end

    def variables
      with_domain_errors { existing_circuit&.to_h&.fetch('variables', {}) || {} }
    end

    def update_required_circuit
      with_domain_errors do
        circuit = existing_circuit || raise(Error, 'circuit.json does not exist')
        yield circuit
        write(circuit)
      end
    end

    private

    attr_reader :path

    def write(circuit)
      temp_path = "#{path}.tmp"
      File.write(temp_path, "#{JSON.pretty_generate(circuit.to_h)}\n")
      File.rename(temp_path, path)
    ensure
      File.delete(temp_path) if temp_path && File.exist?(temp_path)
    end

    def existing_circuit
      return unless File.exist?(path)

      Circuit.from_h(JSON.parse(File.read(path)))
    end

    def update_existing_circuit
      with_domain_errors do
        existing_circuit&.then do |circuit|
          yield circuit
          write(circuit)
        end
      end
    end

    def with_domain_errors
      yield
    rescue JSON::ParserError, Circuit::Error, InitialState::Error => e
      raise Error, e.message
    end
  end
end
