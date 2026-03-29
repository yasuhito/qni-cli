# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/simulator'

module Qni
  class GateOperatorAbstractionTest < Minitest::Test
    CircuitDouble = Struct.new(:data) do
      def to_h
        data
      end
    end

    class FlipOperator
      def apply(zero_amplitude, one_amplitude)
        [one_amplitude, zero_amplitude]
      end
    end

    def test_gate_operator_for_returns_fixed_gate_class
      operator = build_simulator.send(:gate_operator_for, HGate::SYMBOL)

      assert_same HGate, operator
    end

    def test_gate_operator_for_resolves_angled_gate_instance
      operator = build_simulator(variables: { 'theta' => 'π/2' }).send(:gate_operator_for, 'Ry(theta)')

      assert_instance_of RyGate, operator

      zero_amplitude, one_amplitude = operator.apply(1.0, 0.0)
      assert_in_delta Math.sqrt(0.5), zero_amplitude, 1e-12
      assert_in_delta Math.sqrt(0.5), one_amplitude, 1e-12
    end

    def test_step_operation_applies_uncontrolled_gate_operator_instance
      result = Simulator::StepOperation.new(
        col: ['flip'],
        gate_operator_for: ->(_gate) { FlipOperator.new }
      ).apply(StateVector.zero(1))

      assert_equal '0.0,1.0', result.to_csv
    end

    def test_step_operation_applies_controlled_gate_operator_instance
      initial_state = StateVector.new(qubits: 2, amplitudes: [0.0, 0.0, 1.0, 0.0])

      result = Simulator::StepOperation.new(
        col: [Circuit::CONTROL_SYMBOL, 'flip'],
        gate_operator_for: ->(_gate) { FlipOperator.new }
      ).apply(initial_state)

      assert_equal '0.0,0.0,0.0,1.0', result.to_csv
    end

    private

    def build_simulator(variables: {})
      Simulator.new(CircuitDouble.new({ 'qubits' => 1, 'cols' => [], 'variables' => variables }))
    end
  end
end
