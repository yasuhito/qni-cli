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
  end
end
