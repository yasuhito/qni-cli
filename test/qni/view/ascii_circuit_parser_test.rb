# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../../lib/qni/view/ascii_circuit_parser'

module Qni
  module View
    class AsciiCircuitParserTest < Minitest::Test
      EMPTY_CIRCUIT = <<~CIRCUIT
        q0: ─────
      CIRCUIT

      SINGLE_X_GATE = <<~CIRCUIT
            ┌───┐
        q0: ┤ X ├
            └───┘
      CIRCUIT

      DOUBLE_X_GATE = <<~CIRCUIT
            ┌───┐┌───┐
        q0: ┤ X ├┤ X ├
            └───┘└───┘
      CIRCUIT

      LEFT_PACKED_X_GATE = <<~CIRCUIT
        ┌───┐
        q0: ┤ X ├
            └───┘
      CIRCUIT

      def test_parse_single_x_gate_circuit
        circuit = AsciiCircuitParser.new(SINGLE_X_GATE).parse

        assert_equal(
          {
            'qubits' => 1,
            'cols' => [['X']]
          },
          circuit.to_h
        )
      end

      def test_parse_double_x_gate_circuit
        circuit = AsciiCircuitParser.new(DOUBLE_X_GATE).parse

        assert_equal(
          {
            'qubits' => 1,
            'cols' => [['X'], ['X']]
          },
          circuit.to_h
        )
      end

      def test_parse_single_empty_step_circuit
        circuit = AsciiCircuitParser.new(EMPTY_CIRCUIT).parse

        assert_equal(
          {
            'qubits' => 1,
            'cols' => [[1]]
          },
          circuit.to_h
        )
      end

      def test_rejects_left_packed_top_border
        error = assert_raises(AsciiCircuitParser::Error) do
          AsciiCircuitParser.new(LEFT_PACKED_X_GATE).parse
        end

        assert_equal 'ASCII parser lines must align to whole step cells', error.message
      end
    end
  end
end
