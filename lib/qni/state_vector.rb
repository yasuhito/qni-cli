# frozen_string_literal: true

module Qni
  # Holds amplitudes for the current circuit state and renders them for CLI output.
  class StateVector
    # Encapsulates how a single-qubit gate maps amplitude pairs within a state vector.
    class SingleQubitGateLayout
      def initialize(qubits:, qubit:, gate_class:)
        @stride = 1 << (qubits - qubit - 1)
        @block_size = @stride * 2
        @gate_class = gate_class
      end

      attr_reader :block_size

      def apply_block(result, block, block_index)
        each_transformed_pair(block, block_index) do |zero_index, transformed|
          result[zero_index] = transformed.fetch(0)
          result[zero_index + stride] = transformed.fetch(1)
        end
      end

      private

      attr_reader :gate_class, :stride

      def each_transformed_pair(block, block_index)
        base_index = block_index * block_size

        stride.times do |offset|
          yield base_index + offset, gate_class.apply(block.fetch(offset), block.fetch(offset + stride))
        end
      end
    end

    def self.zero(qubits)
      amplitudes = Array.new(1 << qubits, 0.0)
      amplitudes[0] = 1.0
      new(qubits:, amplitudes:)
    end

    def self.format_amplitude(amplitude)
      normalized = amplitude.abs < Float::EPSILON ? 0.0 : amplitude
      normalized.to_s
    end

    def initialize(qubits:, amplitudes:)
      @qubits = qubits
      @amplitudes = amplitudes.dup
    end

    def apply_single_qubit_gate(qubit, gate_class)
      gate_layout = gate_layout_for(qubit, gate_class)
      result = amplitudes.dup

      amplitudes.each_slice(gate_layout.block_size).with_index do |block, block_index|
        gate_layout.apply_block(result, block, block_index)
      end

      self.class.new(qubits:, amplitudes: result)
    end

    def to_csv
      amplitudes.map { |amplitude| self.class.format_amplitude(amplitude) }.join(',')
    end

    private

    attr_reader :amplitudes, :qubits

    def gate_layout_for(qubit, gate_class)
      SingleQubitGateLayout.new(qubits:, qubit:, gate_class:)
    end
  end
end
