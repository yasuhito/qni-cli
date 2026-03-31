# frozen_string_literal: true

module Qni
  # Internal representations for normalized angle expressions.
  module AngleTerm
    # Numeric literal angle.
    class NumericLiteral
      def initialize(value, text)
        @value = value
        @text = text
      end

      def radians(_variables = {})
        value
      end

      def to_s
        text
      end

      def concrete?
        true
      end

      private

      attr_reader :value, :text
    end

    # Variable-backed angle reference.
    class VariableReference
      def initialize(name, expression_class, error_class)
        @name = name
        @expression_class = expression_class
        @error_class = error_class
      end

      def radians(variables = {})
        resolved_value = variables.fetch(name) do
          raise error_class, "unresolved angle variable: #{name}"
        end
        angle = expression_class.new(resolved_value)
        raise error_class, "variable value must be concrete: #{name}" unless angle.concrete?

        angle.radians
      end

      def to_s
        name
      end

      def concrete?
        false
      end

      private

      attr_reader :name, :expression_class, :error_class
    end

    # Product of a scalar and another angle expression.
    class Product
      def initialize(coefficient, coefficient_text, inner)
        @coefficient = coefficient
        @coefficient_text = coefficient_text
        @inner = inner
      end

      def radians(variables = {})
        coefficient * inner.radians(variables)
      end

      def to_s
        "#{coefficient_text}*#{inner}"
      end

      def concrete?
        inner.concrete?
      end

      private

      attr_reader :coefficient, :coefficient_text, :inner
    end

    # Signed wrapper around another angle expression.
    class Signed
      def initialize(sign, sign_text, inner)
        @sign = sign
        @sign_text = sign_text
        @inner = inner
      end

      def radians(variables = {})
        sign * inner.radians(variables)
      end

      def to_s
        sign_text == '+' ? inner.to_s : "#{sign_text}#{inner}"
      end

      def concrete?
        inner.concrete?
      end

      private

      attr_reader :sign, :sign_text, :inner
    end
  end

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

      def radians(_variables = {})
        sign * coefficient * Math::PI / denominator
      end

      def to_s
        "#{sign_prefix}#{coefficient_prefix}π#{denominator_suffix}"
      end

      def concrete?
        true
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
    SIGNED_IDENTIFIER_PATTERN = /\A(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\z/

    def self.numeric_expression(value)
      return unless value.match?(NUMERIC_PATTERN)

      AngleTerm::NumericLiteral.new(value.to_f, value)
    end

    def initialize(raw_value)
      @raw_value = raw_value
    end

    def radians(variables = {})
      parsed_expression_or_error.radians(variables)
    end

    def to_s
      parsed_expression_or_error.to_s
    end

    def concrete?
      parsed_expression&.concrete? || false
    end

    private

    attr_reader :raw_value

    def normalized
      @normalized ||= begin
        value = raw_value.to_s.delete(' ')
                         .gsub('θ', 'theta')
                         .gsub(/(?<=\d)theta/, '*theta')
        raise Error, 'angle is required' if value.empty?

        value
      end
    end

    def parsed_expression
      @parsed_expression ||= parsed_expression_for(normalized)
    end

    def parsed_expression_or_error
      parsed_expression || raise_invalid_angle
    end

    def parsed_expression_for(value)
      self.class.numeric_expression(value) ||
        signed_variable_expression(value) ||
        variable_expression(value) ||
        PiTerm.parse(value) ||
        product_expression(value)
    end

    def signed_variable_expression(value)
      match = SIGNED_IDENTIFIER_PATTERN.match(value)
      return unless match

      sign_text = match[:sign]
      AngleTerm::Signed.new(
        { '+' => 1.0, '-' => -1.0 }.fetch(sign_text),
        sign_text,
        AngleTerm::VariableReference.new(match[:identifier], self.class, Error)
      )
    end

    def variable_expression(value)
      return unless value.match?(IDENTIFIER_PATTERN)

      AngleTerm::VariableReference.new(value, self.class, Error)
    end

    def product_expression(value)
      match = MULTIPLIED_PATTERN.match(value)
      return unless match

      coefficient_text = match[:coefficient]
      inner_expression = self.class.new(match[:term])
      AngleTerm::Product.new(coefficient_text.to_f, coefficient_text, inner_expression)
    end

    def raise_invalid_angle
      raise Error, "invalid angle: #{normalized}"
    end
  end
end
