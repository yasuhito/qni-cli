# frozen_string_literal: true

module Qni
  # Parses and normalizes angle expressions such as π/2, 3*pi/4, and 0.5.
  class AngleExpression
    # Raised when a gate angle cannot be parsed.
    class Error < StandardError; end

    # Represents a concrete multiple of π with optional sign and denominator.
    class PiTerm
      PATTERN = %r{
        \A
        (?<sign>[+-]?)
        (?:(?<coefficient>\d+(?:\.\d+)?)(?:\*)?)?
        (?:π|pi)
        (?:(?:/|_)(?<denominator>\d+(?:\.\d+)?))?
        \z
      }x

      def self.parse(value)
        match = PATTERN.match(value)
        return unless match

        new(match.named_captures.compact.transform_keys(&:to_sym))
      end

      def initialize(parts)
        @parts = parts
      end

      def radians
        sign * coefficient * Math::PI / denominator
      end

      def to_s
        "#{sign_prefix}#{coefficient_prefix}π#{denominator_suffix}"
      end

      private

      attr_reader :parts

      def sign
        parts.fetch(:sign) == '-' ? -1.0 : 1.0
      end

      def sign_prefix
        parts.fetch(:sign) == '-' ? '-' : ''
      end

      def coefficient
        coefficient_text.to_f
      end

      def coefficient_prefix
        coefficient_text == '1' ? '' : coefficient_text
      end

      def coefficient_text
        parts.fetch(:coefficient, '1')
      end

      def denominator
        denominator_text.to_f
      end

      def denominator_suffix
        return '' if denominator_text == '1'

        "/#{denominator_text}"
      end

      def denominator_text
        parts.fetch(:denominator, '1')
      end
    end

    IDENTIFIER_PATTERN = /\A[a-zA-Z_][a-zA-Z0-9_]*\z/
    NUMERIC_PATTERN = /\A[+-]?\d+(?:\.\d+)?\z/
    MULTIPLIED_PATTERN = /\A(?<coefficient>[+-]?\d+(?:\.\d+)?)\*(?<term>.+)\z/

    def initialize(raw_value)
      @raw_value = raw_value
    end

    def radians(variables = {})
      return normalized.to_f if numeric?
      return multiplied_radians(variables) if multiplied_term
      return resolved_variable(variables).radians if variable?
      return pi_term.radians if pi_term

      raise Error, "invalid angle: #{normalized}"
    end

    def to_s
      return normalized if numeric? || variable?
      return multiplied_to_s if multiplied_term
      return pi_term.to_s if pi_term

      raise Error, "invalid angle: #{normalized}"
    end

    def concrete?
      return multiplied_inner.concrete? if multiplied_term

      numeric? || !!pi_term
    end

    private

    attr_reader :raw_value

    def normalized
      @normalized ||= begin
        value = raw_value.to_s.delete(' ')
        raise Error, 'angle is required' if value.empty?

        value
      end
    end

    def numeric?
      normalized.match?(NUMERIC_PATTERN)
    end

    def variable?
      normalized.match?(IDENTIFIER_PATTERN)
    end

    def pi_term
      PiTerm.parse(normalized)
    end

    def multiplied_term
      @multiplied_term ||= MULTIPLIED_PATTERN.match(normalized)
    end

    def multiplied_coefficient
      multiplied_term[:coefficient].to_f
    end

    def multiplied_coefficient_text
      multiplied_term[:coefficient]
    end

    def multiplied_inner
      @multiplied_inner ||= self.class.new(multiplied_term[:term])
    end

    def multiplied_radians(variables)
      multiplied_coefficient * multiplied_inner.radians(variables)
    end

    def multiplied_to_s
      "#{multiplied_coefficient_text}*#{multiplied_inner}"
    end

    def resolved_variable(variables)
      resolved_value = variables.fetch(normalized) { raise Error, "unresolved angle variable: #{normalized}" }
      concrete_variable(resolved_value)
    end

    def concrete_variable(resolved_value)
      angle = self.class.new(resolved_value)
      raise Error, "variable value must be concrete: #{normalized}" unless angle.concrete?

      angle
    end
  end
end
