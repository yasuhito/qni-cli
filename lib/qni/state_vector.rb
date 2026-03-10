# frozen_string_literal: true

module Qni
  class StateVector
    def self.zero(qubits)
      amplitudes = Array.new(1 << qubits, 0.0)
      amplitudes[0] = 1.0
      new(qubits:, amplitudes:)
    end

    def initialize(qubits:, amplitudes:)
      @qubits = qubits
      @amplitudes = amplitudes.dup
    end

    def apply_single_qubit_gate(qubit, gate_class)
      gate_layout = gate_layout_for(qubit, gate_class)
      result = amplitudes.dup

      amplitudes.each_slice(gate_layout.fetch(:block_size)).with_index do |block, block_index|
        apply_gate_block!(result, block, block_index, gate_layout)
      end

      self.class.new(qubits:, amplitudes: result)
    end

    def to_csv
      amplitudes.map { |amplitude| format_amplitude(amplitude) }.join(',')
    end

    private

    attr_reader :amplitudes, :qubits

    def gate_layout_for(qubit, gate_class)
      stride = 1 << (qubits - qubit - 1)

      {
        block_size: stride * 2,
        gate_class:,
        stride:
      }
    end

    def apply_gate_block!(result, block, block_index, gate_layout)
      base_index = block_index * gate_layout.fetch(:block_size)

      gate_layout.fetch(:stride).times do |offset|
        write_gate_pair!(result, block, base_index, offset, gate_layout)
      end
    end

    def write_gate_pair!(result, block, base_index, offset, gate_layout)
      zero_index = base_index + offset
      stride = gate_layout.fetch(:stride)
      transformed = gate_layout.fetch(:gate_class).apply(
        block.fetch(offset),
        block.fetch(offset + stride)
      )

      result[zero_index] = transformed.fetch(0)
      result[zero_index + stride] = transformed.fetch(1)
    end

    def format_amplitude(amplitude)
      normalized = amplitude.abs < Float::EPSILON ? 0.0 : amplitude
      normalized.to_s
    end
  end
end
