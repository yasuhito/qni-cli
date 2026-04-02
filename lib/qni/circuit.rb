# frozen_string_literal: true

require_relative 'circuit/controlled_gate'
require_relative 'circuit/loader'
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
  class Circuit
    # Raised when circuit data is invalid or a requested mutation cannot be applied.
    class Error < StandardError; end
    # Mutable storage for circuit steps, symbolic variables, and optional initial state.
    State = Struct.new(:steps, :variables, :initial_state)
    CONTROL_SYMBOL = '•'

    def self.empty(step:, qubit:)
      new(**Loader.empty_attributes(step:, qubit:))
    end

    def self.from_h(data)
      new(**Loader.attributes_from(data))
    rescue Step::Error => e
      raise Error, e.message
    end

    def initialize(qubits:, steps:, variables: VariableStore.empty, initial_state: nil)
      Loader.validate_qubits!(qubits)
      StepWidthValidator.new(qubits).validate_steps(steps)
      @qubits = qubits
      @state = State.new(steps.dup, variables, initial_state)
    end

    attr_reader :qubits

    def initial_state
      @state.initial_state
    end

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
      @state.variables.set(name:, value:)
    end

    def unset_variable(name:)
      @state.variables.delete(name)
    end

    def clear_variables
      @state.variables.clear
    end

    def variables
      @state.variables.to_h
    end

    def replace_initial_state(next_initial_state)
      expand_qubits_to(next_initial_state.qubits - 1) if next_initial_state
      @state.initial_state = next_initial_state
    end

    def to_h
      result = { 'qubits' => qubits }
      result['initial_state'] = initial_state.to_h if initial_state
      result['cols'] = @state.steps.map(&:to_a)
      result['variables'] = variables unless @state.variables.empty?
      result
    end

    private

    def add_placement(placement)
      steps = @state.steps
      prepare_slots(placement)
      placement.place_on(steps)
      @qubits = LayoutNormalizer.new(steps:, qubits:).normalize
    end

    def prepare_slots(placement)
      expand_qubits_to(placement.max_qubit)
      expand_to(placement.step)
      placement.ensure_available_in(@state.steps)
    end

    def expand_to(step)
      steps = @state.steps
      steps << Step.empty(qubits) until steps.length > step
    end

    def expand_qubits_to(qubit)
      return if qubit < qubits

      count = qubit - qubits + 1
      @state.steps.each { |step| step.extend_right(count) }
      @qubits += count
    end
  end
end
