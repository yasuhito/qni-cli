# frozen_string_literal: true

module Qni
  class CLI < Thor
    # Private instance helpers used by top-level qni commands.
    module InternalHelpers
      private

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
        validate_symbolic_basis_option!

        return render_symbolic_state_vector(simulator) if symbolic_state_requested?

        simulator.render_state_vector
      end

      def validate_symbolic_basis_option!
        raise Thor::Error, '--basis requires --symbolic' if basis_requires_symbolic?
      end

      def basis_requires_symbolic?
        options[:basis] && !symbolic_state_requested?
      end

      def symbolic_state_requested?
        options[:symbolic]
      end

      def render_symbolic_state_vector(simulator)
        simulator.render_symbolic_state_vector(basis: options[:basis])
      end

      def write_output(output)
        return if output.to_s.empty?

        puts output
      end
    end
  end
end
