# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/initial_state'

module Qni
  class InitialStateShorthandTest < Minitest::Test
    PLUS_MINUS_COEFFICIENT = Math.sqrt(0.5).to_s

    def test_parse_plus_state_shorthand
      assert_plus_minus_state(
        shorthand: '|+>',
        expected_terms: [
          { 'basis' => '0', 'coefficient' => PLUS_MINUS_COEFFICIENT },
          { 'basis' => '1', 'coefficient' => PLUS_MINUS_COEFFICIENT }
        ],
        expected_amplitudes: [Math.sqrt(0.5), Math.sqrt(0.5)]
      )
    end

    def test_parse_minus_state_shorthand
      assert_plus_minus_state(
        shorthand: '|->',
        expected_terms: [
          { 'basis' => '0', 'coefficient' => PLUS_MINUS_COEFFICIENT },
          { 'basis' => '1', 'coefficient' => (-Math.sqrt(0.5)).to_s }
        ],
        expected_amplitudes: [Math.sqrt(0.5), -Math.sqrt(0.5)]
      )
    end

    def test_parse_plus_i_state_shorthand
      assert_plus_i_minus_i_state(
        shorthand: '|+i>',
        expected_terms: [
          { 'basis' => '0', 'coefficient' => PLUS_MINUS_COEFFICIENT },
          { 'basis' => '1', 'coefficient' => "#{PLUS_MINUS_COEFFICIENT}i" }
        ],
        expected_amplitudes: [Math.sqrt(0.5), Complex(0, Math.sqrt(0.5))]
      )
    end

    def test_parse_minus_i_state_shorthand
      assert_plus_i_minus_i_state(
        shorthand: '|-i>',
        expected_terms: [
          { 'basis' => '0', 'coefficient' => PLUS_MINUS_COEFFICIENT },
          { 'basis' => '1', 'coefficient' => "-#{PLUS_MINUS_COEFFICIENT}i" }
        ],
        expected_amplitudes: [Math.sqrt(0.5), Complex(0, -Math.sqrt(0.5))]
      )
    end

    private

    def assert_plus_minus_state(shorthand:, expected_terms:, expected_amplitudes:)
      initial_state = InitialState.parse(shorthand)

      assert_equal shorthand, initial_state.to_s
      assert_equal({ 'format' => 'ket_sum_v1', 'terms' => expected_terms }, initial_state.to_h)

      actual_amplitudes = initial_state.resolve_numeric({})
      expected_amplitudes.each_with_index do |expected, index|
        assert_in_delta expected, actual_amplitudes[index], 1e-12
      end
    end

    def assert_plus_i_minus_i_state(shorthand:, expected_terms:, expected_amplitudes:)
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
