# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/initial_state'

module Qni
  class InitialStateTest < Minitest::Test
    EXPECTED_SYMBOLIC_KET_SUM = {
      'format' => 'ket_sum_v1',
      'terms' => [
        { 'basis' => '0', 'coefficient' => 'alpha' },
        { 'basis' => '1', 'coefficient' => 'beta' }
      ]
    }.freeze
    def test_parse_symbolic_ket_sum
      initial_state = InitialState.parse('alpha|0> + beta|1>')

      assert_equal(EXPECTED_SYMBOLIC_KET_SUM, initial_state.to_h)
    end

    def test_resolve_numeric_amplitudes
      initial_state = InitialState.parse('alpha|0> + beta|1>')

      assert_equal [0.6, 0.8], initial_state.resolve_numeric('alpha' => '0.6', 'beta' => '0.8')
    end

    def test_parse_unicode_coefficients_as_ascii_identifiers
      initial_state = InitialState.parse('α|0> + β|1>')

      assert_equal 'alpha|0> + beta|1>', initial_state.to_s
    end

    def test_from_h_rejects_empty_terms
      error = assert_raises(InitialState::Error) do
        InitialState.from_h('format' => 'ket_sum_v1', 'terms' => [])
      end

      assert_equal 'initial state must have at least one term', error.message
    end

    def test_from_h_rejects_unsupported_format
      error = assert_raises(InitialState::Error) do
        InitialState.from_h('format' => 'legacy', 'terms' => [{ 'basis' => '0', 'coefficient' => '1' }])
      end

      assert_equal 'unsupported initial state format: legacy', error.message
    end

    def test_rejects_non_normalized_numeric_state
      initial_state = InitialState.parse('alpha|0> + beta|1>')

      error = assert_raises(InitialState::Error) do
        initial_state.resolve_numeric('alpha' => '1', 'beta' => '1')
      end

      assert_equal 'initial state must be normalized', error.message
    end
  end
end
