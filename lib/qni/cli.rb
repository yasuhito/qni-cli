# frozen_string_literal: true

require 'thor'
require_relative 'angled_gates'
require_relative 'circuit_file'
require_relative 'cli/add_command'
require_relative 'cli/add_help'
require_relative 'cli/add_command_options'
require_relative 'cli/bootstrap'
require_relative 'cli/clear_help'
require_relative 'cli/expect_help'
require_relative 'cli/export_command'
require_relative 'cli/export_help'
require_relative 'cli/run_help'
require_relative 'cli/routing'
require_relative 'cli/state_command'
require_relative 'cli/state_help'
require_relative 'cli/supported_gates'
require_relative 'cli/variable_command'
require_relative 'cli/variable_help'
require_relative 'simulator'
require_relative 'swap_gate'
require_relative 'sqrt_x_gate'
require_relative 's_dagger_gate'
require_relative 't_dagger_gate'

module Qni
  # Thor-based command-line interface for qni subcommands.
  class CLI < Thor
    extend CliBootstrap

    def self.exit_on_failure?
      true
    end

    package_name 'qni'

    desc 'add GATE --qubit=N --step=N', 'Add a gate to the circuit'
    method_option :step, type: :numeric, required: true, desc: '0-based step index'
    method_option :qubit, type: :string, required: true, desc: '0-based qubit index'
    method_option :control, type: :string, desc: 'comma-separated control qubit indices'
    method_option :angle, type: :string, desc: 'phase angle for P, such as π/3 or pi/3'
    def add(gate)
      AddCommand.new(
        circuit_file: current_circuit_file,
        gate: normalize_gate(gate),
        add_options: AddCommandOptions.new(options)
      ).execute
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'view', 'Render the circuit as ASCII art'
    def view
      puts current_circuit_file.load.render_ascii(style: $stdout.tty? ? :colorized : :plain)
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'clear', 'Delete the current circuit file'
    def clear
      current_circuit_file.clear
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'export', 'Export the circuit as qcircuit LaTeX or PNG'
    method_option :latex_source, type: :boolean, default: false, desc: 'Write qcircuit LaTeX'
    method_option :png, type: :boolean, default: false, desc: 'Write PNG rendered from qcircuit LaTeX'
    method_option :state_vector, type: :boolean, default: false, desc: 'Write the symbolic state vector as PNG'
    method_option :dark, type: :boolean, default: false, desc: 'Draw white circuit lines for dark backgrounds'
    method_option :light, type: :boolean, default: false, desc: 'Draw black circuit lines for light backgrounds'
    method_option :output, type: :string, desc: 'Write to this path'
    def export
      output = ExportCommand.new(circuit_file: current_circuit_file, export_options: options).execute
      write_output(output)
    rescue CircuitFile::Error, Simulator::Error => e
      raise Thor::Error, e.message
    end

    map 'run' => :simulate
    desc 'run', 'Show the state vector of the circuit'
    method_option :symbolic, type: :boolean, default: false, desc: 'Show a 1-qubit symbolic state expression'
    method_option :basis, type: :string, desc: 'Show a symbolic state in a named basis such as x'
    def simulate
      puts rendered_state_vector
    rescue CircuitFile::Error, Simulator::Error => e
      raise Thor::Error, e.message
    end

    desc 'expect PAULI_STRING [PAULI_STRING...]', 'Show expectation values of Pauli strings'
    def expect(*pauli_strings)
      circuit = current_circuit_file.load
      puts Simulator.new(circuit).render_expectation_values(pauli_strings.map(&:upcase))
    rescue CircuitFile::Error, Simulator::Error => e
      raise Thor::Error, e.message
    end

    desc 'state SUBCOMMAND ...', 'Manage the initial state vector'
    def state(subcommand = nil, *)
      output = StateCommand.new(path: File.expand_path('circuit.json', Dir.pwd)).execute(subcommand, *)
      write_output(output)
    rescue CircuitFile::Error, StateFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'variable SUBCOMMAND ...', 'Manage symbolic angle variables'
    def variable(subcommand = nil, *)
      output = VariableCommand.new(circuit_file: current_circuit_file).execute(subcommand, *)
      write_output(output)
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    no_commands do
      def current_circuit_file
        @current_circuit_file ||= CircuitFile.new(File.expand_path('circuit.json', Dir.pwd))
      end

      def normalize_gate(gate)
        CliSupportedGates.normalize(gate)
      rescue KeyError
        raise Thor::Error, "unsupported gate: #{gate}"
      end

      def rendered_state_vector
        simulator = Simulator.new(current_circuit_file.load)
        if options[:basis] && !options[:symbolic]
          raise Thor::Error, '--basis requires --symbolic'
        end

        return simulator.render_symbolic_state_vector(basis: options[:basis]) if options[:symbolic]

        simulator.render_state_vector
      end

      def write_output(output)
        return if output.to_s.empty?

        puts output
      end
    end
  end
end
