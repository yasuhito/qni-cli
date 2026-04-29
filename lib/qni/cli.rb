# frozen_string_literal: true

require 'thor'
require_relative 'angled_gates'
require_relative 'circuit_file'
require_relative 'cli/add_command'
require_relative 'cli/add_help'
require_relative 'cli/add_command_options'
require_relative 'cli/bootstrap'
require_relative 'cli/bloch_command'
require_relative 'cli/bloch_help'
require_relative 'cli/clear_help'
require_relative 'cli/expect_help'
require_relative 'cli/export_command'
require_relative 'cli/export_help'
require_relative 'cli/gate_command'
require_relative 'cli/gate_help'
require_relative 'cli/internal_helpers'
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
    include InternalHelpers

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
      puts View::TextRenderer.new(
        current_circuit_file.load,
        style: $stdout.tty? ? :colorized : :plain
      ).render
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'bloch', 'Render the current 1-qubit state on the Bloch sphere'
    method_option :png, type: :boolean, default: false, desc: 'Write a Bloch sphere PNG'
    method_option :apng, type: :boolean, default: false, desc: 'Write a Bloch sphere APNG'
    method_option :inline, type: :boolean, default: false, desc: 'Render inline in a Kitty-compatible terminal'
    method_option :animate, type: :boolean, default: false, desc: 'Animate inline Bloch output'
    method_option :trajectory, type: :boolean, default: false, desc: 'Draw the sampled state-evolution trail'
    method_option :dark, type: :boolean, default: false, desc: 'Draw light content for dark backgrounds'
    method_option :light, type: :boolean, default: false, desc: 'Draw dark content for light backgrounds'
    method_option :output, type: :string, desc: 'Write to this path'
    def bloch
      output = BlochCommand.new(circuit_file: current_circuit_file, bloch_options: options).execute
      write_output(output)
    rescue CircuitFile::Error, Simulator::Error => e
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
    method_option :circle_notation, type: :boolean, default: false, desc: 'Write circle-notation PNG'
    method_option :dark, type: :boolean, default: false, desc: 'Draw white circuit lines for dark backgrounds'
    method_option :light, type: :boolean, default: false, desc: 'Draw black circuit lines for light backgrounds'
    method_option :transparent, type: :boolean, default: true, desc: 'Write PNG with transparent background'
    method_option :caption, type: :string, desc: 'Add a caption to regular circuit export'
    method_option :caption_tex, type: :boolean, default: false, desc: 'Treat --caption as raw LaTeX'
    method_option :caption_position, type: :string, default: 'bottom', desc: 'Caption position: top or bottom'
    method_option :caption_size, type: :numeric, default: 12, desc: 'Caption font size in pt'
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
  end
end
