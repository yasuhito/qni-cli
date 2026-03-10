# frozen_string_literal: true

require 'json'

module Qni
  class CircuitFile
    class Error < StandardError; end

    def initialize(path)
      @path = path
    end

    def add_gate!(gate:, step:, qubit:)
      circuit = load_or_initialize(step:, qubit:)
      expand_cols(circuit, step)
      ensure_slot_available!(circuit, step:, qubit:)

      circuit.fetch('cols')[step][qubit] = gate
      write(circuit)
    end

    private

    attr_reader :path

    def load_or_initialize(step:, qubit:)
      return build_empty_circuit(step:, qubit:) unless File.exist?(path)

      circuit = JSON.parse(File.read(path))
      validate_circuit!(circuit, qubit)
      circuit
    end

    def build_empty_circuit(step:, qubit:)
      qubits = qubit + 1

      {
        'qubits' => qubits,
        'cols' => Array.new(step + 1) { Array.new(qubits, 1) }
      }
    end

    def validate_circuit!(circuit, qubit)
      qubits = circuit['qubits']
      cols = circuit['cols']

      validate_qubits!(qubits)
      validate_cols!(cols, qubits)
      validate_qubit!(qubit, qubits)
    end

    def validate_qubits!(qubits)
      return if qubits.is_a?(Integer) && qubits.positive?

      raise Error, 'qubits must be a positive integer'
    end

    def validate_cols!(cols, qubits)
      raise Error, 'cols must be an array' unless cols.is_a?(Array)
      return if cols.all? { |col| valid_column?(col, qubits) }

      raise Error, 'each column in cols must have exactly qubits entries'
    end

    def valid_column?(col, qubits)
      col.is_a?(Array) && col.length == qubits
    end

    def validate_qubit!(qubit, qubits)
      return if qubit < qubits

      raise Error, 'qubit is out of range for this circuit'
    end

    def expand_cols(circuit, step)
      cols = circuit.fetch('cols')
      qubits = circuit.fetch('qubits')

      cols << Array.new(qubits, 1) until cols.length > step
    end

    def ensure_slot_available!(circuit, step:, qubit:)
      slot = circuit.fetch('cols').fetch(step).fetch(qubit)
      return if slot == 1

      raise Error, "target slot is occupied: cols[#{step}][#{qubit}] = #{slot.inspect}"
    end

    def write(circuit)
      temp_path = "#{path}.tmp"
      File.write(temp_path, "#{JSON.pretty_generate(circuit)}\n")
      File.rename(temp_path, path)
    ensure
      File.delete(temp_path) if temp_path && File.exist?(temp_path)
    end
  end
end
