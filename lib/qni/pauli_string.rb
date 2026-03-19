# frozen_string_literal: true

module Qni
  # Represents a Pauli string observable such as ZZ or XIX.
  class PauliString
    # Raised when a Pauli string is malformed for the current circuit.
    class Error < StandardError; end

    # Tracks how a Pauli string transforms one computational basis index.
    class MappedState
      def initialize(index, phase)
        @index = index
        @phase = phase
      end

      attr_reader :index, :phase

      def apply_i(_mask)
        self
      end

      def apply_x(mask)
        self.class.new(index ^ mask, phase)
      end

      def apply_y(mask)
        self.class.new(index ^ mask, phase * (bit_set?(mask) ? Complex(0, -1) : Complex(0, 1)))
      end

      def apply_z(mask)
        self.class.new(index, phase * (bit_set?(mask) ? -1 : 1))
      end

      def contribution_from(amplitude, amplitudes)
        amplitude.conj * phase * amplitudes.fetch(index)
      end

      private

      def bit_set?(mask)
        index.anybits?(mask)
      end
    end

    VALID_SYMBOLS = %w[I X Y Z].freeze

    def initialize(raw_value, qubits)
      @raw_value = raw_value.to_s.upcase
      @qubits = qubits
      ensure_valid
    end

    attr_reader :raw_value

    def mapped_state(index)
      symbols.each_with_index.reduce(MappedState.new(index, 1.0)) do |current_state, (symbol, qubit)|
        transform(current_state, symbol, qubit)
      end
    end

    private

    attr_reader :qubits

    def ensure_valid
      ensure_length_matches_qubits
      ensure_supported_symbols
    end

    def ensure_length_matches_qubits
      return if raw_value.length == qubits

      raise Error, "Pauli string length must match qubit count: #{raw_value}"
    end

    def ensure_supported_symbols
      return if symbols.all? { |symbol| VALID_SYMBOLS.include?(symbol) }

      raise Error, "Pauli string must use only I, X, Y, and Z: #{raw_value}"
    end

    def symbols
      @symbols ||= raw_value.chars
    end

    def transform(current_state, symbol, qubit)
      current_state.public_send("apply_#{symbol.downcase}", bit_mask(qubit))
    rescue NoMethodError
      raise Error, "Pauli string must use only I, X, Y, and Z: #{raw_value}"
    end

    def bit_mask(qubit)
      1 << (qubits - qubit - 1)
    end
  end
end
