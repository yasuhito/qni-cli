# frozen_string_literal: true

module Qni
  # Encapsulates small 3D vector operations used by Bloch-sphere sampling.
  class BlochVector
    # Holds precomputed Rodrigues-rotation terms for one axis/angle pair.
    RotationContext = Data.define(:axis, :axis_cross_vector, :cos_angle, :sin_angle, :dot_product) do
      def rotated_components(vector_components)
        vector_components.each_with_index.map do |component, index|
          rotated_component(component, axis.fetch(index), axis_cross_vector.fetch(index))
        end
      end

      def rotated_component(component, axis_component, axis_cross_component)
        (component * cos_angle) +
          (axis_cross_component * sin_angle) +
          (axis_component * dot_product * (1 - cos_angle))
      end
    end

    NORMALIZATION_EPSILON = 1e-12

    def initialize(components)
      @components = components
    end

    def rotate(axis:, angle:)
      vector_class = self.class
      vector_class.new(rotation_context(axis, angle).rotated_components(components)).normalized
    end

    def dot(other)
      components.zip(other.to_a).sum { |lhs, rhs| lhs * rhs }
    end

    def cross(other)
      [
        cross_x(other),
        cross_y(other),
        cross_z(other)
      ]
    end

    def normalized
      self.class.new(normalized_components(normalization_divisor))
    end

    def to_a
      components
    end

    private

    attr_reader :components

    def cross_x(other)
      other_components = other.to_a
      (components.fetch(1) * other_components.fetch(2)) - (components.fetch(2) * other_components.fetch(1))
    end

    def cross_y(other)
      other_components = other.to_a
      (components.fetch(2) * other_components.fetch(0)) - (components.fetch(0) * other_components.fetch(2))
    end

    def cross_z(other)
      other_components = other.to_a
      (components.fetch(0) * other_components.fetch(1)) - (components.fetch(1) * other_components.fetch(0))
    end

    def rotation_context(axis, angle)
      axis_vector = self.class.new(axis)
      RotationContext.new(
        axis,
        axis_vector.cross(self),
        Math.cos(angle),
        Math.sin(angle),
        axis_vector.dot(self)
      )
    end

    def normalization_divisor
      magnitude = Math.sqrt(dot(self))
      magnitude.zero? ? 1.0 : magnitude
    end

    def normalized_components(divisor)
      components.map do |component|
        normalized_value = component / divisor
        normalized_value.abs < NORMALIZATION_EPSILON ? 0.0 : normalized_value
      end
    end
  end
end
