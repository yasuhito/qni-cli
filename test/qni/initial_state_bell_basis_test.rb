# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/initial_state'

module Qni
  class InitialStateBellBasisTest < Minitest::Test
    def test_parse_phi_plus_shorthand
      assert_bell_state(
        shorthand: '|Φ+>',
        expected_terms: [
          { 'basis' => 'Φ+', 'coefficient' => '1' }
        ],
        expected_amplitudes: [Math.sqrt(0.5), 0.0, 0.0, Math.sqrt(0.5)]
      )
    end

    def test_parse_phi_minus_shorthand
      assert_bell_state(
        shorthand: '|Φ->',
        expected_terms: [
          { 'basis' => 'Φ-', 'coefficient' => '1' }
        ],
        expected_amplitudes: [Math.sqrt(0.5), 0.0, 0.0, -Math.sqrt(0.5)]
      )
    end

    def test_parse_psi_plus_shorthand
      assert_bell_state(
        shorthand: '|Ψ+>',
        expected_terms: [
          { 'basis' => 'Ψ+', 'coefficient' => '1' }
        ],
        expected_amplitudes: [0.0, Math.sqrt(0.5), Math.sqrt(0.5), 0.0]
      )
    end

    def test_parse_psi_minus_shorthand
      assert_bell_state(
        shorthand: '|Ψ->',
        expected_terms: [
          { 'basis' => 'Ψ-', 'coefficient' => '1' }
        ],
        expected_amplitudes: [0.0, Math.sqrt(0.5), -Math.sqrt(0.5), 0.0]
      )
    end

    def test_parse_bell_basis_linear_combination
      initial_state = InitialState.parse('alpha|Φ+> + beta|Φ->')

      assert_equal(bell_linear_combination_h, initial_state.to_h)
      assert_equal 'alpha|Φ+> + beta|Φ->', initial_state.to_s

      actual_amplitudes = initial_state.resolve_numeric('alpha' => '0.6', 'beta' => '0.8')
      assert_amplitudes_close(expected_linear_combination_amplitudes, actual_amplitudes)
    end

    private

    def bell_linear_combination_h
      {
        'format' => 'ket_sum_v1',
        'terms' => [
          { 'basis' => 'Φ+', 'coefficient' => 'alpha' },
          { 'basis' => 'Φ-', 'coefficient' => 'beta' }
        ]
      }
    end

    def expected_linear_combination_amplitudes
      [Complex(0.9899494936611665, 0.0), 0.0, 0.0, Complex(-0.1414213562373095, 0.0)]
    end

    def assert_bell_state(shorthand:, expected_terms:, expected_amplitudes:)
      initial_state = InitialState.parse(shorthand)

      assert_equal shorthand, initial_state.to_s
      assert_equal({ 'format' => 'ket_sum_v1', 'terms' => expected_terms }, initial_state.to_h)

      actual_amplitudes = initial_state.resolve_numeric({})
      assert_amplitudes_close(expected_amplitudes, actual_amplitudes)
    end

    def assert_amplitudes_close(expected_amplitudes, actual_amplitudes)
      expected_amplitudes.each_with_index do |expected, index|
        assert_amplitude_close(expected, actual_amplitudes[index])
      end
    end

    def assert_amplitude_close(expected, actual)
      return assert_complex_amplitude_close(expected, actual) if expected.is_a?(Complex)

      assert_in_delta expected, actual, 1e-12
    end

    def assert_complex_amplitude_close(expected, actual)
      assert_in_delta expected.real, actual.real, 1e-12
      assert_in_delta expected.imag, actual.imag, 1e-12
    end
  end
end
