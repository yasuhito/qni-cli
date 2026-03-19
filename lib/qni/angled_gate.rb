# frozen_string_literal: true

require_relative 'angle_expression'

module Qni
  # Shared serialization and parsing for gates written as GATE(angle).
  class AngledGate
    def self.command_symbol
      const_get(:COMMAND_SYMBOL)
    end

    def self.parse(serialized_gate, variables: {})
      match = serialized_pattern.match(serialized_gate.to_s)
      return nil unless match

      new(match[1], variables:)
    end

    def self.serialized(angle)
      new(angle).serialized
    end

    def self.serialized_pattern
      @serialized_pattern ||= /\A#{Regexp.escape(command_symbol)}\((.+)\)\z/
    end

    def initialize(angle, variables: {})
      @angle = AngleExpression.new(angle)
      @variables = variables
    end

    def serialized
      "#{self.class.command_symbol}(#{angle})"
    end

    private

    attr_reader :angle, :variables
  end
end
