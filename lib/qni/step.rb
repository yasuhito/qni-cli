# frozen_string_literal: true

module Qni
  # Single column in a circuit, storing one slot per qubit.
  class Step
    # Raised when raw step data cannot be converted into a Step.
    class Error < StandardError; end

    # Maps serialized gate values to the single-character symbols used by qni view.
    class ViewSymbol
      ANGLED_GATE_PATTERN = /\A(?<symbol>[A-Za-z]+)\(.+\)\z/
      PAULI_X = '⊕'
      SWAP = 'Swap'

      def initialize(slot)
        @slot = slot
      end

      def to_s
        return nil if slot == 1
        return PAULI_X if slot == 'X'
        return 'X' if slot == SWAP

        slot.to_s.sub(ANGLED_GATE_PATTERN, '\k<symbol>')
      end

      private

      attr_reader :slot
    end

    def self.empty(qubits)
      new(Array.new(qubits, 1))
    end

    def self.from_a(slots)
      raise Error, 'each column in cols must be an array' unless slots.is_a?(Array)

      new(slots)
    end

    def initialize(slots)
      @slots = slots.dup
    end

    def width
      @slots.length
    end

    def fetch(qubit)
      @slots.fetch(qubit)
    end

    def place_gate(qubit, gate)
      @slots[qubit] = gate
    end

    def empty?
      @slots.all?(1)
    end

    def empty_at?(qubit)
      fetch(qubit) == 1
    end

    def render_slot(qubit)
      symbol = ViewSymbol.new(fetch(qubit)).to_s
      return '-----' unless symbol

      "--#{symbol}#{'-' * [0, 3 - symbol.length].max}"
    end

    def drop_left(count)
      @slots.shift(count)
    end

    def extend_right(count)
      @slots.concat(Array.new(count, 1))
    end

    def to_a
      @slots.dup
    end
  end
end
