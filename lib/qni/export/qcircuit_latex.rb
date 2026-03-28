# frozen_string_literal: true

require_relative '../angled_gates'
require_relative '../circuit'
require_relative '../s_dagger_gate'
require_relative '../sqrt_x_gate'
require_relative '../swap_gate'
require_relative '../t_dagger_gate'

module Qni
  module Export
    # Renders qni's serialized circuit columns as a qcircuit LaTeX document.
    # rubocop:disable Metrics/ClassLength
    class QCircuitLatex
      CONTROL_SYMBOL = Circuit::CONTROL_SYMBOL
      SWAP_SYMBOL = SwapGate::SYMBOL
      HEADER_LINES = [
        '\\documentclass[border=2px]{standalone}',
        '',
        '\\usepackage[braket, qm]{qcircuit}',
        '\\usepackage{graphicx}',
        '\\usepackage{xcolor}',
        '',
        '\\begin{document}',
        '\\scalebox{1.0}{'
      ].freeze
      FOOTER_LINES = [
        '\\\\ }}',
        '\\end{document}'
      ].freeze

      def initialize(circuit, theme: :dark)
        @circuit = circuit
        @data = circuit.to_h
        @theme = theme
      end

      def render
        (HEADER_LINES + [theme_color_line, qcircuit_opening_line, rendered_rows] + FOOTER_LINES).join("\n")
      end

      private

      attr_reader :circuit, :data, :theme

      def cols
        @cols ||= data.fetch('cols')
      end

      def qubits
        data.fetch('qubits')
      end

      def rendered_rows
        (0...qubits).map do |qubit|
          "  #{wire_label(qubit)} & #{rendered_cells(qubit).join(' & ')}\\\\"
        end.join("\n")
      end

      def theme_color_line
        "\\color{#{theme_color_name}}"
      end

      def qcircuit_opening_line
        '\\Qcircuit @C=1.0em @R=0.7em @!R { \\\\'
      end

      def wire_label(qubit)
        "\\lstick{q#{qubit}: \\ket{0}}"
      end

      def rendered_cells(qubit)
        cols.map { |col| render_cell(qubit, col) } + ['\\qw']
      end

      def render_cell(qubit, col)
        return render_swap_cell(qubit, col) if swap_step?(col)
        return render_controlled_cell(qubit, col) if controlled_step?(col)

        render_simple_cell(qubit, col)
      end

      def swap_step?(col)
        col.include?(SWAP_SYMBOL)
      end

      def controlled_step?(col)
        col.include?(CONTROL_SYMBOL)
      end

      def render_swap_cell(qubit, col)
        swap_qubits = col.each_index.select { |index| col.fetch(index) == SWAP_SYMBOL }
        raise "unsupported swap step: #{col.inspect}" unless valid_swap_step?(col, swap_qubits)

        upper, lower = swap_qubits.minmax
        return '\\qswap' if qubit == upper
        return "\\qswap \\qwx[#{upper - lower}]" if qubit == lower

        '\\qw'
      end

      def render_controlled_cell(qubit, col)
        controls, target_slot, target_qubit = controlled_step_parts(col)
        return "\\ctrl{#{target_qubit - qubit}}" if controls.include?(qubit)
        return rendered_controlled_target(target_slot) if qubit == target_qubit

        '\\qw'
      end

      def render_simple_cell(qubit, col)
        slot = col.fetch(qubit)
        return '\\qw' if slot == 1

        "\\gate{#{gate_label(slot)}}"
      end

      def gate_label(slot)
        angled_gate = AngledGates.parse(slot)
        return angled_gate_label(slot) if angled_gate
        return special_gate_label(slot) if special_gate_label?(slot)

        "\\mathrm{#{slot}}"
      end

      def angled_gate_label(slot)
        match = /\A(?<name>[A-Za-z]+)\((?<angle>.+)\)\z/.match(slot)
        raise "unsupported angled gate: #{slot}" unless match

        "\\mathrm{#{match[:name]}}(#{latex_angle(match[:angle])})"
      end

      def latex_angle(angle)
        angle.to_s.gsub('π', '\\pi').gsub(/(?<![A-Za-z])pi(?![A-Za-z])/, '\\pi')
      end

      def valid_swap_step?(col, swap_qubits)
        swap_qubits.length == 2 && col.all? { |slot| [1, SWAP_SYMBOL].include?(slot) }
      end

      def controlled_step_parts(col)
        controls = col.each_index.select { |index| col.fetch(index) == CONTROL_SYMBOL }
        target_slot, target_qubit = controlled_target(col)
        [controls, target_slot, target_qubit]
      end

      def controlled_target(col)
        targets = col.each_with_index.filter_map do |slot, index|
          [slot, index] unless [1, CONTROL_SYMBOL].include?(slot)
        end
        raise "unsupported controlled step: #{col.inspect}" unless targets.one?

        targets.first
      end

      def rendered_controlled_target(target_slot)
        return '\\targ' if target_slot == 'X'

        "\\gate{#{gate_label(target_slot)}}"
      end

      def special_gate_label?(slot)
        [SqrtXGate::SYMBOL, SDaggerGate::SYMBOL, TDaggerGate::SYMBOL].include?(slot)
      end

      def special_gate_label(slot)
        case slot
        when SqrtXGate::SYMBOL
          '\\sqrt{\\mathrm{X}}'
        when SDaggerGate::SYMBOL
          '\\mathrm{S^\\dagger}'
        when TDaggerGate::SYMBOL
          '\\mathrm{T^\\dagger}'
        end
      end

      def theme_color_name
        case theme
        when :dark
          'white'
        when :light
          'black'
        else
          raise "unsupported export theme: #{theme.inspect}"
        end
      end
    end
    # rubocop:enable Metrics/ClassLength
  end
end
