# frozen_string_literal: true

require_relative 'sqrt_x_gate'

module Qni
  # Single column in a circuit, storing one slot per qubit.
  class Step
    # Raised when raw step data cannot be converted into a Step.
    class Error < StandardError; end

    # Maps serialized gate values to the single-character symbols used by qni view.
    class ViewSymbol
      # Renders a normalized gate label into a fixed-width view cell.
      class ViewCell
        EMPTY_CELL = '-----'

        def initialize(label)
          @label = label
        end

        def to_s
          return EMPTY_CELL unless label
          return "-#{label}--" if label == SqrtXGate::VIEW_SYMBOL

          "--#{label}#{'-' * [0, 3 - label.length].max}"
        end

        private

        attr_reader :label
      end

      ANGLED_GATE_PATTERN = /\A(?<symbol>[A-Za-z]+)\(.+\)\z/
      PAULI_X = '⊕'
      SWAP = 'Swap'

      def initialize(slot)
        @slot = slot
      end

      def to_s
        return nil if slot == 1
        return PAULI_X if slot == 'X'
        return SqrtXGate::VIEW_SYMBOL if slot == SqrtXGate::SYMBOL
        return 'X' if slot == SWAP

        slot.to_s.sub(ANGLED_GATE_PATTERN, '\k<symbol>')
      end

      def to_cell
        ViewCell.new(to_s).to_s
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

    def clear_gate(qubit)
      @slots[qubit] = 1
    end

    def empty?
      @slots.all?(1)
    end

    def empty_at?(qubit)
      fetch(qubit) == 1
    end

    def render_slot(qubit)
      ViewSymbol.new(fetch(qubit)).to_cell
    end

    def drop_left(count)
      @slots.shift(count)
    end

    def drop_right(count)
      @slots.pop(count)
    end

    def extend_right(count)
      @slots.concat(Array.new(count, 1))
    end

    def to_a
      @slots.dup
    end
  end
end
