# frozen_string_literal: true

require_relative '../circuit'
require_relative 'ascii_step_parser'
require_relative 'ascii_wire_layout'

module Qni
  module View
    # Builds a circuit from a small ASCII-art subset of qni's text renderer.
    class AsciiCircuitParser
      # Raised when the provided ASCII art cannot be converted into a circuit.
      class Error < StandardError; end

      def initialize(ascii_art)
        @ascii_art = ascii_art
      end

      def parse
        layout = AsciiWireLayout.new(ascii_art, error_class: Error)

        Circuit.from_h(
          'qubits' => layout.qubit_count,
          'cols' => layout.each_step.map do |step_slices|
            AsciiStepParser.new(step_slices, error_class: Error).to_slots
          end
        )
      end

      private

      attr_reader :ascii_art
    end
  end
end
