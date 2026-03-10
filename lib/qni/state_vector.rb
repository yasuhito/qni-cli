# frozen_string_literal: true

module Qni
  # Holds amplitudes for the current circuit state and renders them for CLI output.
  class StateVector
    # Formats real and complex amplitudes for CLI output.
    class AmplitudeFormatter
      EPSILON = Float::EPSILON

      def initialize(amplitude)
        @amplitude = amplitude
      end

      def format
        return normalized_value.to_s unless amplitude.is_a?(Complex)

        format_complex
      end

      private

      attr_reader :amplitude

      def format_complex
        return formatted_real if purely_real?
        return "#{formatted_imaginary}i" if purely_imaginary?

        "#{formatted_real}#{imaginary_prefix}#{formatted_imaginary}i"
      end

      def normalized_value
        amplitude.abs < EPSILON ? 0.0 : amplitude
      end

      def purely_real?
        imaginary.zero?
      end

      def purely_imaginary?
        real.zero?
      end

      def formatted_real
        real.to_s
      end

      def formatted_imaginary
        imaginary.to_s
      end

      def imaginary_prefix
        imaginary.positive? ? '+' : ''
      end

      def real
        @real ||= begin
          value = amplitude.real
          value.abs < EPSILON ? 0.0 : value
        end
      end

      def imaginary
        @imaginary ||= begin
          value = amplitude.imag
          value.abs < EPSILON ? 0.0 : value
        end
      end
    end

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

    # Applies a single-qubit gate only when all control qubits are set to 1.
    class ControlledSingleQubitGateLayout < SingleQubitGateLayout
      def initialize(qubits:, qubit:, controls:, gate_class:)
        super(qubits:, qubit:, gate_class:)
        @controls = controls
        @qubits = qubits
      end

      def apply_block(result, block, block_index)
        each_transformed_pair(block, block_index) do |zero_index, transformed|
          next unless controls_active?(zero_index)

          result[zero_index] = transformed.fetch(0)
          result[zero_index + stride] = transformed.fetch(1)
        end
      end

      private

      attr_reader :controls, :qubits

      def controls_active?(zero_index)
        controls.all? { |control| zero_index.anybits?(bit_mask(control)) }
      end

      def bit_mask(control)
        1 << (qubits - control - 1)
      end
    end

    def self.zero(qubits)
      amplitudes = Array.new(1 << qubits, 0.0)
      amplitudes[0] = 1.0
      new(qubits:, amplitudes:)
    end

    def self.format_amplitude(amplitude)
      AmplitudeFormatter.new(amplitude).format
    end

    def initialize(qubits:, amplitudes:)
      @qubits = qubits
      @amplitudes = amplitudes.dup
    end

    def apply_single_qubit_gate(qubit, gate_class)
      apply_gate_layout(SingleQubitGateLayout.new(qubits:, qubit:, gate_class:))
    end

    def apply_controlled_single_qubit_gate(controls, qubit, gate_class)
      apply_gate_layout(ControlledSingleQubitGateLayout.new(qubits:, qubit:, controls:, gate_class:))
    end

    def to_csv
      amplitudes.map { |amplitude| self.class.format_amplitude(amplitude) }.join(',')
    end

    private

    attr_reader :amplitudes, :qubits

    def apply_gate_layout(gate_layout)
      result = amplitudes.dup

      amplitudes.each_slice(gate_layout.block_size).with_index do |block, block_index|
        gate_layout.apply_block(result, block, block_index)
      end

      self.class.new(qubits:, amplitudes: result)
    end
  end
end
