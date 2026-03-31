# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/bloch_sampler'

module Qni
  class BlochSamplerTest < Minitest::Test
    def test_zero_state_maps_to_positive_z
      frames = BlochSampler.new(empty_circuit).frames

      assert_equal [0.0, 0.0, 1.0], frames.first.fetch('vector')
    end

    def test_h_gate_ends_at_positive_x
      frames = BlochSampler.new(single_gate_circuit('H')).frames

      assert_vector_close frames.last.fetch('vector'), [1.0, 0.0, 0.0]
    end

    def test_ry_rotation_adds_intermediate_frames
      frames = BlochSampler.new(single_gate_circuit('Ry(π/2)')).frames

      assert_operator frames.length, :>, 2
      assert_vector_close frames.last.fetch('vector'), [1.0, 0.0, 0.0]
    end

    def test_s_gate_adds_intermediate_phase_frames
      frames = BlochSampler.new(
        circuit_with_initial_state('|+>', 'S')
      ).frames

      assert_operator frames.length, :>, 2
      assert_vector_close frames.last.fetch('vector'), [0.0, -1.0, 0.0]
    end

    private

    def empty_circuit
      {
        'qubits' => 1,
        'cols' => [[1]]
      }
    end

    def single_gate_circuit(gate)
      {
        'qubits' => 1,
        'cols' => [[gate]]
      }
    end

    def circuit_with_initial_state(initial_state, gate)
      {
        'qubits' => 1,
        'initial_state' => InitialState.parse(initial_state).to_h,
        'cols' => [[gate]]
      }
    end

    def assert_vector_close(actual, expected)
      expected.each_with_index do |value, index|
        assert_in_delta value, actual.fetch(index), 1e-12
      end
    end
  end
end
