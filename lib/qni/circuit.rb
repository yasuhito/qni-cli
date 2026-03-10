# frozen_string_literal: true

require_relative 'step'

module Qni
  class Circuit
    class Error < StandardError; end

    def self.empty(step:, qubit:)
      qubits = qubit + 1
      steps = Array.new(step + 1) { Step.empty(qubits) }
      new(qubits:, steps:)
    end

    def self.from_h(data)
      qubits = data['qubits']
      cols = data['cols']

      validate_qubits!(qubits)
      validate_cols!(cols, qubits)

      new(qubits:, steps: cols.map { |col| Step.from_a(col) })
    rescue Step::Error => e
      raise Error, e.message
    end

    def self.validate_qubits!(qubits)
      return if qubits.is_a?(Integer) && qubits.positive?

      raise Error, 'qubits must be a positive integer'
    end

    def self.validate_cols!(cols, qubits)
      raise Error, 'cols must be an array' unless cols.is_a?(Array)
      return if cols.all? { |col| col.is_a?(Array) && col.length == qubits }

      raise Error, 'each column in cols must have exactly qubits entries'
    end

    def initialize(qubits:, steps:)
      self.class.validate_qubits!(qubits)
      validate_steps!(steps, qubits)

      @qubits = qubits
      @steps = steps.dup
    end

    attr_reader :qubits

    def add_gate!(gate:, step:, qubit:)
      validate_qubit!(qubit)
      expand_to(step)
      ensure_slot_available!(step, qubit)

      @steps.fetch(step).place_gate!(qubit, gate)
    end

    def to_h
      {
        'qubits' => qubits,
        'cols' => @steps.map(&:to_a)
      }
    end

    private

    def validate_steps!(steps, qubits)
      raise Error, 'cols must be an array' unless steps.is_a?(Array)
      return if steps.all? { |step| step.is_a?(Step) && step.width == qubits }

      raise Error, 'each column in cols must have exactly qubits entries'
    end

    def validate_qubit!(qubit)
      return if qubit < qubits

      raise Error, 'qubit is out of range for this circuit'
    end

    def expand_to(step)
      @steps << Step.empty(qubits) until @steps.length > step
    end

    def ensure_slot_available!(step, qubit)
      slot = @steps.fetch(step).fetch(qubit)
      return if slot == 1

      raise Error, "target slot is occupied: cols[#{step}][#{qubit}] = #{slot.inspect}"
    end
  end
end
