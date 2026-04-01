# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'bloch_vector'

module Qni
  # Resolves gates into Bloch-sphere rotations and whether they should be interpolated.
  class BlochRotationResolver
    class << self
      def display_axis(axis)
        BlochVector.new(
          axis.each_with_index.map { |component, index| component * DISPLAY_COORDINATE_FLIP.fetch(index) }
        ).normalized.to_a
      end
    end

    DISPLAY_COORDINATE_FLIP = [1.0, -1.0, 1.0].freeze
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

    def initialize(variables:, trajectory:)
      @variables = variables
      @trajectory = trajectory
    end

    def interpolated_rotation_for(gate)
      rotation = bloch_rotation_for(gate)
      return rotation if trajectory
      return rotation if ANGLED_GATE_PATTERN.match?(gate)
      return rotation if FIXED_PHASE_ROTATION_ANGLES.key?(gate)

      nil
    end

    private

    attr_reader :trajectory, :variables

    def bloch_rotation_for(gate)
      return angled_bloch_rotation(gate) if ANGLED_GATE_PATTERN.match?(gate)

      fixed_rotation = FIXED_BLOCH_ROTATIONS[gate]
      return unless fixed_rotation

      {
        axis: self.class.display_axis(fixed_rotation.fetch(:axis)),
        angle: -fixed_rotation.fetch(:angle)
      }
    end

    def angled_bloch_rotation(gate)
      gate_name, total_angle = parse_angled_gate(gate)

      {
        axis: self.class.display_axis(ANGLED_GATE_AXES.fetch(gate_name)),
        angle: -total_angle
      }
    end

    def parse_angled_gate(gate)
      match = ANGLED_GATE_PATTERN.match(gate.to_s)
      raise Simulator::Error, "unsupported gate for bloch sampling: #{gate.inspect}" unless match

      [match[:gate], AngleExpression.new(match[:angle]).radians(variables)]
    end
  end
end
