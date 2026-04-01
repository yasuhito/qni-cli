# frozen_string_literal: true

require_relative 'circuit/controlled_gate'
require_relative 'circuit/layout_normalizer'
require_relative 'circuit/slot_position'
require_relative 'circuit/symbol_placement'
require_relative 'initial_state'
require_relative 'swap_gate'
require_relative 'step'
require_relative 'circuit/step_width_validator'
require_relative 'circuit/variable_store'
require_relative 'view/text_renderer'

module Qni
  # Mutable circuit model backed by qubit count and column-oriented steps.
  # rubocop:disable Metrics/ClassLength
  class Circuit
    # Raised when circuit data is invalid or a requested mutation cannot be applied.
    class Error < StandardError; end
    CONTROL_SYMBOL = '•'

    def self.empty(step:, qubit:)
      qubits = qubit + 1
      steps = Array.new(step + 1) { Step.empty(qubits) }
      new(qubits:, steps:, variables: VariableStore.empty, initial_state: nil)
    end

    def self.from_h(data)
      new(**attributes_from(data))
    rescue Step::Error => e
      raise Error, e.message
    end

    def self.attributes_from(data)
      qubits = validated_qubits(data.fetch('qubits'))
      initial_state_data = data['initial_state']

      {
        qubits:,
        steps: validated_steps(data.fetch('cols'), qubits),
        variables: VariableStore.build(data.fetch('variables', {})),
        initial_state: initial_state_data && InitialState.from_h(initial_state_data)
      }
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
      validate_cols(cols, qubits).map { |col| Step.from_a(col) }
    end

    def initialize(qubits:, steps:, variables: VariableStore.empty, initial_state: nil)
      self.class.validate_qubits!(qubits)
      StepWidthValidator.new(qubits).validate_steps(steps)
      @qubits = qubits
      store_state(steps, variables, initial_state)
    end

    attr_reader :initial_state, :qubits

    def add_gate(gate:, step:, qubit:)
      add_placement(SymbolPlacement.new(step:, symbols: { qubit => gate }))
    end

    def add_controlled_gate(step:, controlled_gate:)
      add_placement(SymbolPlacement.new(step:, symbols: controlled_gate.symbols))
    end

    def add_swap_gate(step:, targets:)
      add_placement(SymbolPlacement.new(step:, symbols: targets.to_h { |target| [target, SwapGate::SYMBOL] }))
    end

    def set_variable(name:, value:)
      @variables.set(name:, value:)
    end

    def unset_variable(name:)
      @variables.delete(name)
    end

    def clear_variables
      @variables.clear
    end

    def render_ascii(style: :plain)
      View::TextRenderer.new(self, style:).render
    end

    def variables
      @variables.to_h
    end

    def replace_initial_state(next_initial_state)
      expand_qubits_to(next_initial_state.qubits - 1) if next_initial_state
      @initial_state = next_initial_state
    end

    def to_h
      result = { 'qubits' => qubits }
      result['initial_state'] = initial_state.to_h if initial_state
      result['cols'] = @steps.map(&:to_a)
      result['variables'] = variables unless @variables.empty?
      result
    end

    private

    def store_state(steps, variables, initial_state)
      @steps = steps.dup
      @variables = variables
      @initial_state = initial_state
    end

    def add_placement(placement)
      prepare_slots(placement)
      placement.place_on(@steps)
      @qubits = LayoutNormalizer.new(steps: @steps, qubits:).normalize
    end

    def prepare_slots(placement)
      expand_qubits_to(placement.max_qubit)
      expand_to(placement.step)
      placement.ensure_available_in(@steps)
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
  end
  # rubocop:enable Metrics/ClassLength
end
