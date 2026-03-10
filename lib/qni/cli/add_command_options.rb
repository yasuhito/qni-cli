# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Parses and validates qni add command options.
    class AddCommandOptions
      def initialize(options)
        @options = options
      end

      def controlled?
        !control_value.to_s.empty?
      end

      def controls
        value = control_value.to_s
        raise Thor::Error, 'control must not be empty' if value.empty?

        value.split(',').map { |index| parse_non_negative_integer(index, :control) }
      end

      def qubit
        fetch_required_index(:qubit)
      end

      def step
        fetch_required_index(:step)
      end

      private

      attr_reader :options

      def control_value
        options['control']
      end

      def fetch_required_index(name)
        value = options[name.to_s]
        raise Thor::Error, "#{name} is required" if value.to_s.empty?

        parse_non_negative_integer(value, name)
      end

      def parse_non_negative_integer(value, name)
        parsed_value = Integer(value)
        return parsed_value unless parsed_value.negative?

        raise Thor::Error, "#{name} must be >= 0"
      end
    end
  end
end
