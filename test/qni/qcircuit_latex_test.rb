# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/circuit'
require_relative '../../lib/qni/export/qcircuit_latex'
require_relative '../../lib/qni/s_dagger_gate'
require_relative '../../lib/qni/sqrt_x_gate'
require_relative '../../lib/qni/swap_gate'

module Qni
  class QCircuitLatexTest < Minitest::Test
    def test_render_formats_swap_as_qswap_and_qwx
      latex = render_cols([[SwapGate::SYMBOL, SwapGate::SYMBOL]])

      assert_includes latex, '\\qswap'
      assert_includes latex, '\\qwx[-1]'
    end

    def test_render_formats_special_and_angled_gate_labels
      latex = render_cols([['Rx(π/2)', SDaggerGate::SYMBOL, SqrtXGate::SYMBOL]])

      assert_includes latex, '\\gate{\\mathrm{Rx}(\\\\pi/2)}'
      assert_includes latex, '\\gate{\\mathrm{S^\\dagger}}'
      assert_includes latex, '\\gate{\\sqrt{\\mathrm{X}}}'
    end

    def test_render_formats_controlled_non_x_target_with_gate_label
      latex = render_cols([[Circuit::CONTROL_SYMBOL, SDaggerGate::SYMBOL]])

      assert_includes latex, '\\ctrl{1}'
      assert_includes latex, '\\gate{\\mathrm{S^\\dagger}}'
    end

    private

    def render_cols(cols)
      circuit = Circuit.from_h(
        'qubits' => cols.first.length,
        'cols' => cols
      )

      Export::QCircuitLatex.new(circuit).render
    end
  end
end
