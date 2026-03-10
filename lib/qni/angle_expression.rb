# frozen_string_literal: true

module Qni
  # Parses and normalizes angle expressions such as π/2, 3*pi/4, and 0.5.
  class AngleExpression
    # Raised when a gate angle cannot be parsed.
    class Error < StandardError; end

    NUMERIC_PATTERN = /\A[+-]?\d+(?:\.\d+)?\z/
    PI_PATTERN = %r{
      \A
      (?<sign>[+-]?)
      (?:(?<coefficient>\d+(?:\.\d+)?)(?:\*)?)?
      (?:π|pi)
      (?:(?:/|_)(?<denominator>\d+(?:\.\d+)?))?
      \z
    }x

    def initialize(raw_value)
      @raw_value = raw_value
    end

    def radians
      return normalized.to_f if numeric?

      sign * coefficient * Math::PI / denominator
    end

    def to_s
      return normalized if numeric?

      "#{sign_prefix}#{coefficient_prefix}π#{denominator_suffix}"
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

    def parts
      @parts ||= begin
        match = PI_PATTERN.match(normalized)
        raise Error, "invalid angle: #{normalized}" unless match

        match.named_captures.compact.transform_keys(&:to_sym)
      end
    end
  end
end
