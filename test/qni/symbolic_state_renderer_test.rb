# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/simulator'

module Qni
  class SymbolicStateRendererTest < Minitest::Test
    def test_render_supports_two_qubit_tensor_product_gate_column
      output = SymbolicStateRenderer.new(
        { 'qubits' => 2, 'cols' => [%w[H H]] }
      ).render

      assert_equal '1/2|00> + 1/2|01> + 1/2|10> + 1/2|11>', output
    end

    def test_basis_x_requires_one_qubit
      error = assert_raises(Simulator::Error) do
        SymbolicStateRenderer.new(
          { 'qubits' => 2, 'cols' => [[1, 1]] },
          basis: 'x'
        ).render
      end

      assert_equal 'symbolic x-basis run currently supports only 1-qubit circuits', error.message
    end

    def test_render_supports_three_qubit_computational_basis_state
      output = SymbolicStateRenderer.new(
        { 'qubits' => 3, 'cols' => [[1, 1, 1]] }
      ).render

      assert_equal '|000>', output
    end

    def test_render_supports_three_qubit_ghz_state
      output = SymbolicStateRenderer.new(
        ghz_three_qubit_circuit
      ).render

      assert_equal 'sqrt(2)/2|000> + sqrt(2)/2|111>', output
    end

    private

    def ghz_three_qubit_circuit
      {
        'qubits' => 3,
        'cols' => [
          ['H', 1, 1],
          ['•', 'X', 1],
          ['•', 1, 'X']
        ]
      }
    end
  end
end
