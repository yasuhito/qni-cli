# frozen_string_literal: true

require_relative '../state_file'

module Qni
  class CLI < Thor
    # Executes qni state subcommands against a circuit file.
    class StateCommand
      SUBCOMMANDS = {
        'set' => :set,
        'show' => :show,
        'clear' => :clear
      }.freeze

      def initialize(path:)
        @state_file = StateFile.new(path)
      end

      def clear
        state_file.clear
      end

      def execute(subcommand, *)
        public_send(resolve_subcommand(subcommand), *)
      end

      def set(expression)
        value = expression.to_s
        raise Thor::Error, 'initial state expression is required' if value.empty?

        state_file.set(value)
      end

      def show
        state_file.show
      end

      private

      attr_reader :state_file

      def resolve_subcommand(subcommand)
        SUBCOMMANDS.fetch(subcommand) { raise Thor::Error, "unsupported state subcommand: #{subcommand}" }
      end
    end
  end
end
