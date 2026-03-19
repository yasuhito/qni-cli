# frozen_string_literal: true

require_relative 'phase_gate'
require_relative 'rx_gate'
require_relative 'ry_gate'
require_relative 'rz_gate'

module Qni
  # Registry for parameterized gates that are serialized as GATE(angle).
  module AngledGates
    CLASSES = [
      PhaseGate,
      RxGate,
      RyGate,
      RzGate
    ].freeze

    def self.fetch(command_symbol)
      by_symbol[command_symbol]
    end

    def self.parse(serialized_gate, variables: {})
      CLASSES.each do |gate_class|
        parsed_gate = gate_class.parse(serialized_gate, variables:)
        return parsed_gate if parsed_gate
      end

      nil
    end

    def self.by_symbol
      @by_symbol ||= CLASSES.to_h { |gate_class| [gate_class.command_symbol, gate_class] }
    end
  end
end
