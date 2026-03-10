# frozen_string_literal: true

require_relative 'step'
require_relative 'circuit/slot_position'
require_relative 'circuit/step_width_validator'

module Qni
  # Mutable circuit model backed by qubit count and column-oriented steps.
  class Circuit
    # Raised when circuit data is invalid or a requested mutation cannot be applied.
    class Error < StandardError; end

    def self.empty(step:, qubit:)
      qubits = qubit + 1
      steps = Array.new(step + 1) { Step.empty(qubits) }
      new(qubits:, steps:)
    end

    def self.from_h(data)
      qubits = validated_qubits(data.fetch('qubits'))
      steps = validated_steps(data.fetch('cols'), qubits)
      new(qubits:, steps:)
    rescue Step::Error => e
      raise Error, e.message
    end

    def self.build_steps(cols)
      cols.map { |col| Step.from_a(col) }
    end

    def self.validate_qubits!(qubits)
      return if qubits.is_a?(Integer) && qubits.positive?

      raise Error, 'qubits must be a positive integer'
    end

    def self.validate_cols(cols, qubits)
      StepWidthValidator.new(qubits).validate_raw_cols(cols)
      cols
    end

    def self.validated_qubits(qubits)
      validate_qubits!(qubits)
      qubits
    end

    def self.validated_steps(cols, qubits)
      build_steps(validate_cols(cols, qubits))
    end

    def initialize(qubits:, steps:)
      self.class.validate_qubits!(qubits)
      StepWidthValidator.new(qubits).validate_steps(steps)

      @qubits = qubits
      @steps = steps.dup
    end

    attr_reader :qubits

    def add_gate(gate:, step:, qubit:)
      position = SlotPosition.new(step:, qubit:)
      prepare_slot(position)
      @steps.fetch(position.step).place_gate(position.qubit, gate)
      normalize_layout
    end

    def render_ascii
      (0...qubits).map { |qubit| render_qubit_line(qubit) }.join("\n")
    end

    def to_h
      {
        'qubits' => qubits,
        'cols' => @steps.map(&:to_a)
      }
    end

    private

    def prepare_slot(position)
      expand_qubits_to(position.qubit)
      expand_to(position.step)
      ensure_slot_available(position)
    end

    def normalize_layout
      trim_leading_empty_steps
      trim_leading_empty_qubits
    end

    def expand_to(step)
      @steps << Step.empty(qubits) until @steps.length > step
    end

    def expand_qubits_to(qubit)
      return if qubit < qubits

      count = qubit - qubits + 1
      @steps.each { |step| step.extend_right(count) }
      @qubits += count
    end

    def ensure_slot_available(position)
      step = position.step
      qubit = position.qubit
      slot = @steps.fetch(step).fetch(qubit)
      return if slot == 1

      raise Error, "target slot is occupied: cols[#{step}][#{qubit}] = #{slot.inspect}"
    end

    def trim_leading_empty_steps
      @steps.shift while @steps.length > 1 && @steps.first.empty?
    end

    def trim_leading_empty_qubits
      count = leading_empty_qubits_count
      return if count.zero?

      @steps.each { |step| step.drop_left(count) }
      @qubits -= count
    end

    def leading_empty_qubits_count
      count = 0
      count += 1 while removable_leading_qubit?(count)
      count
    end

    def removable_leading_qubit?(qubit)
      qubit < qubits - 1 && @steps.all? { |step| step.empty_at?(qubit) }
    end

    def render_qubit_line(qubit)
      "q#{qubit}: #{@steps.map { |step| step.render_slot(qubit) }.join}"
    end
  end
end
