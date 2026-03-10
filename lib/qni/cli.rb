# frozen_string_literal: true

require 'thor'
require_relative 'circuit_file'

module Qni
  class CLI < Thor
    def self.exit_on_failure?
      true
    end

    def self.printable_commands(...)
      super.reject { |item| item.first.start_with?('qni tree') }
    end

    package_name 'qni'

    desc 'add GATE', 'Add a gate to the circuit'
    method_option :step, type: :numeric, required: true, desc: '0-based step index'
    method_option :qubit, type: :numeric, required: true, desc: '0-based qubit index'
    def add(gate)
      perform_add(normalize_gate(gate), fetch_index(:step), fetch_index(:qubit))
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    desc 'view', 'Render the circuit as ASCII art'
    def view
      puts CircuitFile.new(File.expand_path('circuit.json', Dir.pwd)).load.render_ascii
    rescue CircuitFile::Error => e
      raise Thor::Error, e.message
    end

    no_commands do
      def perform_add(gate, step, qubit)
        CircuitFile.new(File.expand_path('circuit.json', Dir.pwd)).add_gate!(gate:, step:, qubit:)
      end

      def normalize_gate(gate)
        normalized_gate = gate.to_s.upcase
        return normalized_gate if normalized_gate == 'H'

        raise Thor::Error, "unsupported gate: #{gate}"
      end

      def fetch_index(name)
        value = Integer(options.fetch(name.to_s))
        return value unless value.negative?

        raise Thor::Error, "#{name} must be >= 0"
      end
    end
  end
end
