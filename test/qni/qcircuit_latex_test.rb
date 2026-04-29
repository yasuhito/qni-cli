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

    def test_render_formats_blank_slots_with_compact_terminal_wire
      latex = render_cols([['', 'X']])

      assert_includes latex, 'q0: \\ket{0}} & \\qw & \\qw'
      assert_includes latex, 'q1: \\ket{0}} & \\gate{\\mathrm{X}} & \\qw'
      assert_includes latex, '\\Qcircuit @C=0.55em'
    end

    def test_render_formats_identity_slots_as_wire_cells
      latex = render_cols([[1, 'X']])

      assert_includes latex, 'q0: \\ket{0}} & \\qw & \\qw'
      assert_includes latex, 'q1: \\ket{0}} & \\gate{\\mathrm{X}} & \\qw'
    end

    def test_render_formats_empty_circuit_with_padding_wire_columns
      latex = render_data({ 'qubits' => 2, 'cols' => [] })

      assert_includes latex, 'q0: \\ket{0}} & \\qw & \\qw & \\qw & \\qw'
      assert_includes latex, 'q1: \\ket{0}} & \\qw & \\qw & \\qw & \\qw'
    end

    def test_render_adds_bottom_caption_by_default
      latex = render_cols([['H']], caption: 'CNOT before cut')

      assert_includes latex, '\\\\[0.8em]'
      assert_includes latex, '{\\fontsize{12}{15}\\selectfont CNOT before cut}'
    end

    def test_render_escapes_caption_latex_special_characters
      latex = render_cols([['H']], caption: 'Z_X & 50%')

      assert_includes latex, 'Z\\_X \\& 50\\%'
    end

    def test_render_maps_common_quantum_caption_symbols_to_latex
      latex = render_cols([['H']], caption: '+1/2 · Z⊗X')

      assert_includes latex, '+1/2 $\\cdot$ Z$\\otimes$X'
    end

    def test_render_can_use_raw_latex_caption
      latex = render_cols([['H']], caption: '$\\mathrm{CNOT} = I \\otimes X$', caption_format: :tex)

      assert_includes latex, '$\\mathrm{CNOT} = I \\otimes X$'
    end

    private

    def render_cols(cols, **)
      render_data(
        {
          'qubits' => cols.first.length,
          'cols' => cols
        },
        **
      )
    end

    def render_data(data = nil, **)
      circuit = Circuit.from_h(data)

      Export::QCircuitLatex.new(circuit, **).render
    end
  end
end
