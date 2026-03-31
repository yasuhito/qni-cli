# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../../lib/qni/view/ascii_circuit_parser'

module Qni
  module View
    module AsciiCircuitFixtures
      CONTROLLED_VALIDATION_EXPECTED = {
        'qubits' => 2,
        'cols' => [
          ['H', 1],
          ['•', 'X'],
          ['•', 'X'],
          ['H', 1]
        ]
      }.freeze

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

      CONTROLLED_X_GATE = <<~CIRCUIT
            ┌───┐
        q0: ──■──
            ┌─┴─┐
        q1: ┤ X ├
            └───┘
      CIRCUIT

      CONTROLLED_VALIDATION_CIRCUIT = <<~CIRCUIT
            ┌───┐           ┌───┐
        q0: ┤ H ├──■────■──┤ H ├
            └───┘┌─┴─┐┌─┴─┐└───┘
        q1: ─────┤ X ├┤ X ├─────
                 └───┘└───┘
      CIRCUIT

      RY_GATE = <<~CIRCUIT
             π/2
            ┌───┐
        q0: ┤ Ry├
            └───┘
      CIRCUIT

      LEGACY_RY_GATE = <<~CIRCUIT
            ┌─────────┐
        q0: ┤ Ry(π/2) ├
            └─────────┘
      CIRCUIT

      LEFT_PACKED_X_GATE = <<~CIRCUIT
        ┌───┐
        q0: ┤ X ├
            └───┘
      CIRCUIT
    end

    class AsciiCircuitParserTest < Minitest::Test
      include AsciiCircuitFixtures

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

      def test_parse_two_qubit_controlled_x_circuit
        circuit = AsciiCircuitParser.new(CONTROLLED_X_GATE).parse

        assert_equal(
          {
            'qubits' => 2,
            'cols' => [['•', 'X']]
          },
          circuit.to_h
        )
      end

      def test_parse_two_qubit_multi_step_controlled_circuit
        assert_parsed_circuit(CONTROLLED_VALIDATION_CIRCUIT, CONTROLLED_VALIDATION_EXPECTED)
      end

      def test_parse_angled_gate_circuit
        circuit = AsciiCircuitParser.new(RY_GATE).parse

        assert_equal(
          {
            'qubits' => 1,
            'cols' => [['Ry(π/2)']]
          },
          circuit.to_h
        )
      end

      def test_rejects_legacy_long_box_angled_gate
        error = assert_raises(AsciiCircuitParser::Error) do
          AsciiCircuitParser.new(LEGACY_RY_GATE).parse
        end

        assert_equal 'ASCII parser angled gates require a dedicated angle line above the box', error.message
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

      def assert_parsed_circuit(ascii_art, expected)
        circuit = AsciiCircuitParser.new(ascii_art).parse

        assert_equal expected, circuit.to_h
      end
    end
  end
end
