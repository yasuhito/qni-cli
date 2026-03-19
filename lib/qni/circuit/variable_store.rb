# frozen_string_literal: true

require_relative '../angle_expression'

module Qni
  class Circuit
    # Stores symbolic angle variables and validates their names and values.
    class VariableStore
      NAME_PATTERN = AngleExpression::IDENTIFIER_PATTERN

      def self.build(raw_variables)
        raise Error, 'variables must be an object' unless raw_variables.is_a?(Hash)

        new(raw_variables.to_h { |name, value| [validate_name(name), canonical_value(value)] })
      end

      def self.empty
        new
      end

      def self.validate_name(name)
        return name if name.is_a?(String) && name.match?(NAME_PATTERN)

        raise Error, "invalid variable name: #{name}"
      end

      def self.canonical_value(value)
        angle = AngleExpression.new(value)
        raise Error, "variable value must be concrete: #{value}" unless angle.concrete?

        angle.to_s
      rescue AngleExpression::Error => e
        raise Error, e.message
      end

      def initialize(values = {})
        @values = values.dup
      end

      def set(name:, value:)
        store_class = self.class
        values[store_class.validate_name(name)] = store_class.canonical_value(value)
      end

      def delete(name)
        values.delete(self.class.validate_name(name))
      end

      def clear
        values.clear
      end

      def empty?
        values.empty?
      end

      def to_h
        values.dup
      end

      private

      attr_reader :values
    end
  end
end
