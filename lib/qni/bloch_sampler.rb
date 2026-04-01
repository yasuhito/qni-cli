# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'bloch_rotation_resolver'
require_relative 'angled_gates'
require_relative 'bloch_vector'
require_relative 'initial_state'
require_relative 'simulator'
require_relative 'state_vector'

module Qni
  # Samples 1-qubit state evolution as Bloch vectors for rendering.
  class BlochSampler
    # Builds intermediate Bloch vectors for a single rotation over fixed frame steps.
    class RotationFrameSequence
      def initialize(start_vector:, rotation:, frame_count:, rotate_vector:)
        @start_vector = start_vector
        @rotation = rotation
        @frame_count = frame_count
        @rotate_vector = rotate_vector
      end

      def frames
        Array.new(frame_count) do |index|
          { 'vector' => rotate_vector.call(start_vector, axis, partial_angle(index)) }
        end
      end

      private

      attr_reader :frame_count, :rotate_vector, :rotation, :start_vector

      def axis
        rotation.fetch(:axis)
      end

      def partial_angle(index)
        rotation.fetch(:angle) * (index + 1) / frame_count.to_f
      end
    end

    INTERMEDIATE_ROTATION_FRAMES = 12
    INTERPOLATION_MODES = {
      gates_only: false,
      trajectory: true
    }.freeze

    def initialize(circuit_data, interpolation: :gates_only)
      @data = circuit_data
      @trajectory = INTERPOLATION_MODES.fetch(interpolation)
    end

    def frames
      assert_single_qubit_circuit

      current_state = starting_state_vector
      [{ 'vector' => current_state.bloch_coordinates }] + sampled_frames_for(current_state)
    rescue AngleExpression::Error, InitialState::Error => e
      raise Simulator::Error, e.message
    end

    private

    attr_reader :data, :trajectory

    def rotation_resolver
      @rotation_resolver ||= BlochRotationResolver.new(
        variables: data.fetch('variables', {}),
        trajectory:
      )
    end

    def sampled_frames_for(initial_state)
      current_state = initial_state

      data.fetch('cols').each_with_object([]) do |col, frames|
        next if col.all?(1)

        frames.concat(sample_col_frames(current_state, col))
        current_state = state_after_col(current_state, col)
      end
    end

    def sample_col_frames(current_state, col)
      gate = col.length == 1 ? col.fetch(0).to_s : nil
      rotation = gate && rotation_resolver.interpolated_rotation_for(gate)
      return sample_rotation_frames(current_state, rotation) if rotation

      [{ 'vector' => state_after_col(current_state, col).bloch_coordinates }]
    end

    def starting_state_vector
      initial_state = data['initial_state']
      qubit_count = data.fetch('qubits')
      return StateVector.zero(qubit_count) unless initial_state

      StateVector.new(
        qubits: qubit_count,
        amplitudes: InitialState.from_h(initial_state).resolve_numeric(data.fetch('variables', {}))
      )
    end

    def state_after_col(state_vector, col)
      Simulator::StepOperation.new(col:, gate_operator_for: method(:gate_operator_for)).apply(state_vector)
    end

    def gate_operator_for(gate)
      return Simulator::FIXED_GATE_OPERATORS.fetch(gate) if Simulator::FIXED_GATE_OPERATORS.key?(gate)

      parsed_gate = AngledGates.parse(gate, variables: data.fetch('variables', {}))
      return parsed_gate if parsed_gate

      raise Simulator::Error, "unsupported gate for bloch sampling: #{gate.inspect}"
    end

    def assert_single_qubit_circuit
      return if data.fetch('qubits') == 1

      raise Simulator::Error, 'bloch currently supports only 1-qubit circuits'
    end

    def sample_rotation_frames(current_state, rotation)
      RotationFrameSequence.new(
        start_vector: current_state.bloch_coordinates,
        rotation:,
        frame_count: INTERMEDIATE_ROTATION_FRAMES,
        rotate_vector: lambda do |vector, axis, angle|
          BlochVector.new(vector).rotate(axis:, angle:).to_a
        end
      ).frames
    end
  end
end
