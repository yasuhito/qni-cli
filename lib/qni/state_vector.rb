# frozen_string_literal: true

require_relative 'pauli_string'

module Qni
  # Holds amplitudes for the current circuit state and renders them for CLI output.
  class StateVector
    # Formats real and complex amplitudes for CLI output.
    class AmplitudeFormatter
      EPSILON = Float::EPSILON

      def self.normalize_scalar(value)
        return 0.0 if value.abs < EPSILON

        nearest_integer = value.round
        return nearest_integer.to_f if (value - nearest_integer).abs <= EPSILON

        value
      end

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
        self.class.normalize_scalar(amplitude)
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
        @real ||= self.class.normalize_scalar(amplitude.real)
      end

      def imaginary
        @imaginary ||= self.class.normalize_scalar(amplitude.imag)
      end
    end

    # Encapsulates how a single-qubit gate maps amplitude pairs within a state vector.
    class SingleQubitGateLayout
      def initialize(qubits:, qubit:, gate_operator:)
        @stride = 1 << (qubits - qubit - 1)
        @block_size = @stride * 2
        @gate_operator = gate_operator
      end

      attr_reader :block_size

      def apply_block(result, block, block_index)
        each_transformed_pair(block, block_index) do |zero_index, transformed|
          result[zero_index] = transformed.fetch(0)
          result[zero_index + stride] = transformed.fetch(1)
        end
      end

      private

      attr_reader :gate_operator, :stride

      def each_transformed_pair(block, block_index)
        base_index = block_index * block_size

        stride.times do |offset|
          yield base_index + offset, gate_operator.apply(block.fetch(offset), block.fetch(offset + stride))
        end
      end
    end

    # Applies a single-qubit gate only when all control qubits are set to 1.
    class ControlledSingleQubitGateLayout < SingleQubitGateLayout
      def initialize(qubits:, qubit:, controls:, gate_operator:)
        super(qubits:, qubit:, gate_operator:)
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

    # Reorders amplitudes to swap two qubits.
    class SwapLayout
      def initialize(qubits:, first_qubit:, second_qubit:)
        @first_mask = 1 << (qubits - first_qubit - 1)
        @second_mask = 1 << (qubits - second_qubit - 1)
      end

      def destination_index(index)
        return index if index.anybits?(first_mask) == index.anybits?(second_mask)

        index ^ first_mask ^ second_mask
      end

      private

      attr_reader :first_mask, :second_mask
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

    def apply_single_qubit_gate(qubit, gate_operator)
      apply_gate_layout(SingleQubitGateLayout.new(qubits:, qubit:, gate_operator:))
    end

    def apply_controlled_single_qubit_gate(controls, qubit, gate_operator)
      apply_gate_layout(ControlledSingleQubitGateLayout.new(qubits:, qubit:, controls:, gate_operator:))
    end

    def apply_swap(first_qubit, second_qubit)
      apply_swap_layout(SwapLayout.new(qubits:, first_qubit:, second_qubit:))
    end

    def to_csv
      amplitudes.map { |amplitude| self.class.format_amplitude(amplitude) }.join(',')
    end

    def expectation(pauli_string)
      observable = PauliString.new(pauli_string, qubits)

      amplitudes.each_with_index.reduce(0.0) do |sum, (amplitude, index)|
        sum + expectation_contribution(observable, amplitude, index)
      end
    end

    def bloch_coordinates
      vector_class = self.class

      [
        vector_class.real_component(expectation('X')),
        vector_class.real_component(expectation('Y')),
        vector_class.real_component(expectation('Z'))
      ]
    end

    def self.real_component(value)
      (value.is_a?(Complex) ? value.real : value).to_f
    end

    private

    attr_reader :amplitudes, :qubits

    def expectation_contribution(observable, amplitude, index)
      observable.mapped_state(index).contribution_from(amplitude, amplitudes)
    end

    def apply_gate_layout(gate_layout)
      result = amplitudes.dup

      amplitudes.each_slice(gate_layout.block_size).with_index do |block, block_index|
        gate_layout.apply_block(result, block, block_index)
      end

      self.class.new(qubits:, amplitudes: result)
    end

    def apply_swap_layout(layout)
      result = Array.new(amplitudes.length)

      amplitudes.each_with_index do |amplitude, index|
        result[layout.destination_index(index)] = amplitude
      end

      self.class.new(qubits:, amplitudes: result)
    end
  end
end
