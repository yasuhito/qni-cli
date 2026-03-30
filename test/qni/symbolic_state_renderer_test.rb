# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/simulator'

module Qni
  class SymbolicStateRendererTest < Minitest::Test
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
