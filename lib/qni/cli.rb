# frozen_string_literal: true

require 'thor'
require_relative 'circuit_file'
require_relative 'cli/add_command'
require_relative 'cli/add_command_options'
require_relative 'simulator'

module Qni
  # Thor-based command-line interface for qni subcommands.
  class CLI < Thor
    ADD_HELP = <<~TEXT
      Usage:
        qni add GATE --qubit=N --step=N
        qni add GATE --control=CONTROL --qubit=N --step=N

      Overview:
        Add a gate to ./circuit.json.
        If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
        step and qubit are 0-based indices.
        Supported gates: H, X, Y, Z, S, T.
        With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
        CNOT is written as qni add X --control 0 --qubit 1 --step 0.

      Options:
        --step=N             # 0-based step index
        --qubit=N            # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices

      Examples:
        qni add H --qubit 0 --step 0
        qni add X --qubit 1 --step 3
        qni add X --control 0 --qubit 1 --step 0
        qni add H --control 0 --qubit 2 --step 4
    TEXT

    SUPPORTED_GATES = %w[H X Y Z S T].freeze

    def self.exit_on_failure?
      true
    end

    def self.start(given_args = ARGV, config = {})
      return $stdout.puts(ADD_HELP) if add_help_request?(given_args)

      if help_request?(given_args)
        warn(help_unavailable_message)
        exit(1)
      end

      super
    end

    def self.printable_commands(...)
      super.reject { |item| item.first.start_with?('qni tree') }
           .filter_map do |usage, description|
             summarized_usage = summarize_usage(usage)
             [summarized_usage, description] if summarized_usage
           end
    end

    package_name 'qni'

    desc 'add GATE --qubit=N --step=N', 'Add a gate to the circuit'
    method_option :step, type: :numeric, required: true, desc: '0-based step index'
    method_option :qubit, type: :numeric, required: true, desc: '0-based qubit index'
    method_option :control, type: :string, desc: 'comma-separated control qubit indices'
    def add(gate)
      AddCommand.new(
        circuit_file: CircuitFile.new(File.expand_path('circuit.json', Dir.pwd)),
        gate: normalize_gate(gate),
        add_options: AddCommandOptions.new(options)
      ).execute
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'view', 'Render the circuit as ASCII art'
    def view
      puts CircuitFile.new(File.expand_path('circuit.json', Dir.pwd)).load.render_ascii
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    map 'run' => :simulate
    desc 'run', 'Show the state vector of the circuit'
    def simulate
      circuit = CircuitFile.new(File.expand_path('circuit.json', Dir.pwd)).load
      puts Simulator.new(circuit).render_state_vector
    rescue CircuitFile::Error, Simulator::Error => e
      raise Thor::Error, e.message
    end

    no_commands do
      def normalize_gate(gate)
        normalized_gate = gate.to_s.upcase
        return normalized_gate if SUPPORTED_GATES.include?(normalized_gate)

        raise Thor::Error, "unsupported gate: #{gate}"
      end
    end

    class << self
      private

      def add_help_request?(given_args)
        [%w[add], %w[add --help], %w[add -h]].include?(given_args)
      end

      def help_request?(given_args)
        given_args.first == 'help'
      end

      def help_unavailable_message
        'qni help is not available; use qni or qni COMMAND --help'
      end

      def summarize_usage(usage)
        return nil if usage.start_with?('qni help')
        return 'qni add' if usage.start_with?('qni add ')

        usage
      end
    end
  end
end
