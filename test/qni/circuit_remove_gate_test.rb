# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/circuit'

module Qni
  class CircuitRemoveGateTest < Minitest::Test
    def test_remove_single_qubit_gate
      circuit = circuit_from_cols([['H']])

      circuit.remove_gate(step: 0, qubit: 0)

      assert_equal({ 'qubits' => 1, 'cols' => [[1]] }, circuit.to_h)
    end

    def test_remove_controlled_gate_from_control
      circuit = circuit_from_cols([['•', 'X']])

      circuit.remove_gate(step: 0, qubit: 0)

      assert_equal({ 'qubits' => 1, 'cols' => [[1]] }, circuit.to_h)
    end

    def test_remove_controlled_gate_from_target
      circuit = circuit_from_cols([['•', 'X']])

      circuit.remove_gate(step: 0, qubit: 1)

      assert_equal({ 'qubits' => 1, 'cols' => [[1]] }, circuit.to_h)
    end

    def test_remove_swap_gate_from_one_slot
      circuit = circuit_from_cols([%w[Swap Swap]])

      circuit.remove_gate(step: 0, qubit: 1)

      assert_equal({ 'qubits' => 1, 'cols' => [[1]] }, circuit.to_h)
    end

    def test_remove_only_selected_independent_gate
      circuit = circuit_from_cols([%w[H X]])

      circuit.remove_gate(step: 0, qubit: 1)

      assert_equal({ 'qubits' => 1, 'cols' => [['H']] }, circuit.to_h)
    end

    def test_remove_empty_slot_fails
      circuit = circuit_from_cols([['H', 1]])

      error = assert_raises(Circuit::Error) { circuit.remove_gate(step: 0, qubit: 1) }

      assert_equal('slot is empty: cols[0][1]', error.message)
    end

    def test_remove_missing_slot_fails
      circuit = circuit_from_cols([['H']])

      error = assert_raises(Circuit::Error) { circuit.remove_gate(step: 1, qubit: 0) }

      assert_equal('slot does not exist: cols[1][0]', error.message)
    end

    private

    def circuit_from_cols(cols)
      Circuit.from_h(
        'qubits' => cols.first.length,
        'cols' => cols
      )
    end
  end
end
