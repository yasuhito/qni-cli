# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'angled_gates'
require_relative 'initial_state'
require_relative 'simulator'
require_relative 'state_vector'

module Qni
  # Samples 1-qubit state evolution as Bloch vectors for rendering.
  # rubocop:disable Metrics/ClassLength
  class BlochSampler
    DISPLAY_COORDINATE_FLIP = [1.0, -1.0, 1.0].freeze
    INTERMEDIATE_ROTATION_FRAMES = 12
    ANGLED_GATE_PATTERN = /\A(?<gate>P|Rx|Ry|Rz)\((?<angle>.+)\)\z/
    FIXED_PHASE_ROTATION_ANGLES = {
      'Z' => Math::PI,
      'S' => Math::PI / 2,
      'S†' => -(Math::PI / 2),
      'T' => Math::PI / 4,
      'T†' => -(Math::PI / 4)
    }.freeze
    ANGLED_GATE_AXES = {
      'P' => [0.0, 0.0, 1.0],
      'Rx' => [1.0, 0.0, 0.0],
      'Ry' => [0.0, 1.0, 0.0],
      'Rz' => [0.0, 0.0, 1.0]
    }.freeze
    FIXED_BLOCH_ROTATIONS = {
      'H' => { axis: [Math.sqrt(0.5), 0.0, Math.sqrt(0.5)], angle: Math::PI },
      'S' => { axis: [0.0, 0.0, 1.0], angle: Math::PI / 2 },
      'S†' => { axis: [0.0, 0.0, 1.0], angle: -(Math::PI / 2) },
      'T' => { axis: [0.0, 0.0, 1.0], angle: Math::PI / 4 },
      'T†' => { axis: [0.0, 0.0, 1.0], angle: -(Math::PI / 4) },
      'X' => { axis: [1.0, 0.0, 0.0], angle: Math::PI },
      'Y' => { axis: [0.0, 1.0, 0.0], angle: Math::PI },
      'Z' => { axis: [0.0, 0.0, 1.0], angle: Math::PI },
      '√X' => { axis: [1.0, 0.0, 0.0], angle: Math::PI / 2 }
    }.freeze
    NORMALIZATION_EPSILON = 1e-12

    def initialize(circuit_data, trajectory: false)
      @data = circuit_data
      @trajectory = trajectory
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
      rotation = gate && interpolated_rotation_for(gate)
      return sample_rotation_frames(current_state, rotation) if rotation

      [{ 'vector' => state_after_col(current_state, col).bloch_coordinates }]
    end

    def interpolated_rotation_for(gate)
      return bloch_rotation_for(gate) if trajectory
      return bloch_rotation_for(gate) if ANGLED_GATE_PATTERN.match?(gate)
      return bloch_rotation_for(gate) if FIXED_PHASE_ROTATION_ANGLES.key?(gate)

      nil
    end

    def bloch_rotation_for(gate)
      return angled_bloch_rotation(gate) if ANGLED_GATE_PATTERN.match?(gate)

      fixed_rotation = FIXED_BLOCH_ROTATIONS[gate]
      return unless fixed_rotation

      {
        axis: displayed_axis(fixed_rotation.fetch(:axis)),
        angle: -fixed_rotation.fetch(:angle)
      }
    end

    def angled_bloch_rotation(gate)
      gate_name, total_angle = parse_angled_gate(gate)

      {
        axis: displayed_axis(ANGLED_GATE_AXES.fetch(gate_name)),
        angle: -total_angle
      }
    end

    def parse_angled_gate(gate)
      match = ANGLED_GATE_PATTERN.match(gate.to_s)
      raise Simulator::Error, "unsupported gate for bloch sampling: #{gate.inspect}" unless match

      [match[:gate], AngleExpression.new(match[:angle]).radians(data.fetch('variables', {}))]
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

    def displayed_axis(axis)
      normalize_vector(
        axis.each_with_index.map { |component, index| component * DISPLAY_COORDINATE_FLIP.fetch(index) }
      )
    end

    def sample_rotation_frames(current_state, rotation)
      start_vector = current_state.bloch_coordinates

      Array.new(INTERMEDIATE_ROTATION_FRAMES) do |index|
        angle = rotation.fetch(:angle) * (index + 1) / INTERMEDIATE_ROTATION_FRAMES.to_f
        { 'vector' => rotate_vector(start_vector, rotation.fetch(:axis), angle) }
      end
    end

    # rubocop:disable Metrics/MethodLength
    def rotate_vector(vector, axis, angle)
      cos_angle = Math.cos(angle)
      sin_angle = Math.sin(angle)
      dot_product = dot(axis, vector)
      axis_cross_vector = cross(axis, vector)

      normalize_vector(
        rotated_components(
          vector,
          axis,
          axis_cross_vector,
          cos_angle,
          sin_angle,
          dot_product
        )
      )
    end
    # rubocop:enable Metrics/MethodLength

    # rubocop:disable Metrics/ParameterLists
    def rotated_components(vector, axis, axis_cross_vector, cos_angle, sin_angle, dot_product)
      vector.each_with_index.map do |component, index|
        rotated_component(component, index, axis, axis_cross_vector, cos_angle, sin_angle, dot_product)
      end
    end

    def rotated_component(component, index, axis, axis_cross_vector, cos_angle, sin_angle, dot_product)
      (component * cos_angle) +
        (axis_cross_vector.fetch(index) * sin_angle) +
        (axis.fetch(index) * dot_product * (1 - cos_angle))
    end
    # rubocop:enable Metrics/ParameterLists

    def dot(left, right)
      left.zip(right).sum { |lhs, rhs| lhs * rhs }
    end

    def cross(left, right)
      [
        cross_x(left, right),
        cross_y(left, right),
        cross_z(left, right)
      ]
    end

    def cross_x(left, right)
      (left.fetch(1) * right.fetch(2)) - (left.fetch(2) * right.fetch(1))
    end

    def cross_y(left, right)
      (left.fetch(2) * right.fetch(0)) - (left.fetch(0) * right.fetch(2))
    end

    def cross_z(left, right)
      (left.fetch(0) * right.fetch(1)) - (left.fetch(1) * right.fetch(0))
    end

    def normalize_vector(vector)
      magnitude = Math.sqrt(dot(vector, vector))
      return vector.map { |component| normalize_component(component) } if magnitude.zero?

      vector.map { |component| normalize_component(component / magnitude) }
    end

    def normalize_component(component)
      return 0.0 if component.abs < NORMALIZATION_EPSILON

      component
    end
  end
  # rubocop:enable Metrics/ClassLength
end
