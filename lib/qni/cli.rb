# frozen_string_literal: true

require 'thor'
require_relative 'circuit_file'
require_relative 'cli/add_command'
require_relative 'cli/add_command_options'
require_relative 'simulator'

module Qni
  # Thor-based command-line interface for qni subcommands.
  class CLI < Thor
    SUPPORTED_GATES = %w[H X Y Z S T].freeze

    def self.exit_on_failure?
      true
    end

    def self.printable_commands(...)
      super.reject { |item| item.first.start_with?('qni tree') }
    end

    package_name 'qni'

    desc 'add GATE', 'Add a gate to the circuit'
    method_option :step, type: :numeric, required: true, desc: '0-based step index'
    method_option :qubit, type: :numeric, desc: '0-based qubit index'
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
  end
end
