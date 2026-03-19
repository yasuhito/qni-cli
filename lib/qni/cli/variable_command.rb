# frozen_string_literal: true

require_relative '../angle_expression'

module Qni
  class CLI < Thor
    # Executes qni variable subcommands against a circuit file.
    class VariableCommand
      SUBCOMMANDS = {
        'set' => :set,
        'list' => :list,
        'unset' => :unset,
        'clear' => :clear
      }.freeze

      VARIABLE_NAME_PATTERN = AngleExpression::IDENTIFIER_PATTERN

      def initialize(circuit_file:)
        @circuit_file = circuit_file
      end

      def clear
        circuit_file.clear_variables
      end

      def execute(subcommand, *)
        public_send(resolve_subcommand(subcommand), *)
      end

      def list
        circuit_file.variables.sort.map { |name, value| "#{name}=#{value}" }.join("\n")
      end

      def set(name, value)
        circuit_file.set_variable(name: validated_name(name), value: validated_value(value))
      end

      def unset(name)
        circuit_file.unset_variable(name: validated_name(name))
      end

      private

      attr_reader :circuit_file

      def resolve_subcommand(subcommand)
        SUBCOMMANDS.fetch(subcommand) { raise Thor::Error, "unsupported variable subcommand: #{subcommand}" }
      end

      def validated_name(name)
        value = name.to_s
        raise Thor::Error, 'variable name is required' if value.empty?
        return value if value.match?(VARIABLE_NAME_PATTERN)

        raise Thor::Error, "invalid variable name: #{value}"
      end

      def validated_value(value)
        angle = AngleExpression.new(value)
        raise Thor::Error, "variable value must be concrete: #{value}" unless angle.concrete?

        angle.to_s
      rescue AngleExpression::Error => e
        raise Thor::Error, e.message
      end
    end
  end
end
