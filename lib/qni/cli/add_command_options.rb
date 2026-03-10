# frozen_string_literal: true

require_relative '../angled_gates'
require_relative '../angle_expression'

module Qni
  class CLI < Thor
    # Parses and validates qni add command options.
    class AddCommandOptions
      def angle_given?
        !options['angle'].to_s.empty?
      end

      def initialize(options)
        @options = options
      end

      def controlled?
        !control_value.to_s.empty?
      end

      def serialized_gate(gate)
        gate_class = AngledGates.fetch(gate)
        return gate unless gate_class

        gate_class.serialized(angle_value(gate))
      rescue AngleExpression::Error => e
        raise Thor::Error, e.message
      end

      def controls
        value = control_value.to_s
        raise Thor::Error, 'control must not be empty' if value.empty?

        value.split(',').map { |index| parse_non_negative_integer(index, :control) }
      end

      def qubit
        targets = fetch_required_indices(:qubit)
        raise Thor::Error, 'qubit must contain exactly 1 index' unless targets.one?

        targets.first
      end

      def swap_targets
        targets = fetch_required_indices(:qubit)
        raise Thor::Error, 'SWAP requires exactly 2 target qubits' unless targets.length == 2
        raise Thor::Error, 'SWAP target qubits must be different' unless targets.uniq == targets

        targets
      end

      def step
        fetch_required_index(:step)
      end

      private

      attr_reader :options

      def angle_value(gate)
        value = options['angle'].to_s
        raise Thor::Error, "angle is required for #{gate}" if value.empty?

        value
      end

      def control_value
        options['control']
      end

      def fetch_required_index(name)
        value = options[name.to_s]
        raise Thor::Error, "#{name} is required" if value.to_s.empty?

        parse_non_negative_integer(value, name)
      end

      def fetch_required_indices(name)
        value = options[name.to_s]
        raise Thor::Error, "#{name} is required" if value.to_s.empty?

        value.split(',').map { |entry| parse_non_negative_integer(entry, name) }
      end

      def parse_non_negative_integer(value, name)
        parsed_value = Integer(value)
        return parsed_value unless parsed_value.negative?

        raise Thor::Error, "#{name} must be >= 0"
      end
    end
  end
end
