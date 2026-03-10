# frozen_string_literal: true

require_relative 'h_gate'

module Qni
  class Simulator
    class Error < StandardError; end

    GATE_CLASSES = {
      HGate::SYMBOL => HGate
    }.freeze

    def initialize(circuit)
      @data = circuit.to_h
    end

    def render_state_vector
      state_vector.map { |amplitude| format_amplitude(amplitude) }.join(',')
    end

    private

    attr_reader :data

    def state_vector
      cols.reduce(initial_state_vector) do |amplitudes, col|
        apply_col(amplitudes, col)
      end
    end

    def qubits
      data.fetch('qubits')
    end

    def cols
      data.fetch('cols')
    end

    def initial_state_vector
      Array.new(1 << qubits, 0.0).tap { |amplitudes| amplitudes[0] = 1.0 }
    end

    def apply_col(amplitudes, col)
      col.each_with_index.reduce(amplitudes) do |current, (gate, qubit)|
        apply_gate(current, gate, qubit)
      end
    end

    def apply_gate(amplitudes, gate, qubit)
      return amplitudes if gate == 1

      gate_class = gate_class_for(gate)
      apply_single_qubit_gate(amplitudes, qubit, gate_class)
    end

    def gate_class_for(gate)
      GATE_CLASSES.fetch(gate)
    rescue KeyError
      raise Error, "unsupported gate for run: #{gate.inspect}"
    end

    def apply_single_qubit_gate(amplitudes, qubit, gate_class)
      gate_layout = {
        stride: 1 << (qubits - qubit - 1),
        gate_class:
      }
      gate_layout[:block_size] = gate_layout.fetch(:stride) * 2
      result = amplitudes.dup

      amplitudes.each_slice(gate_layout.fetch(:block_size)).with_index do |block, block_index|
        apply_gate_block!(result, block, block_index, gate_layout)
      end

      result
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
      one_index = zero_index + stride
      gate_class = gate_layout.fetch(:gate_class)
      transformed = gate_class.apply(block.fetch(offset), block.fetch(offset + stride))

      result[zero_index] = transformed.fetch(0)
      result[one_index] = transformed.fetch(1)
    end

    def format_amplitude(amplitude)
      normalized = amplitude.abs < Float::EPSILON ? 0.0 : amplitude
      normalized.to_s
    end
  end
end
