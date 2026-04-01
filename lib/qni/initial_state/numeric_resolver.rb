# frozen_string_literal: true

module Qni
  class InitialState
    # Resolves initial-state coefficient strings into numeric amplitudes.
    class NumericResolver
      def initialize(variables)
        @variables = variables
      end

      def resolve(coefficient)
        return coefficient.to_f if coefficient.match?(AngleExpression::NUMERIC_PATTERN)
        return imaginary_numeric(coefficient) if coefficient.match?(Term::IMAGINARY_NUMERIC_PATTERN)

        signed_identifier = Term::SIGNED_IDENTIFIER_PATTERN.match(coefficient)
        if signed_identifier
          return signed_identifier_value(sign: signed_identifier[:sign], identifier: signed_identifier[:identifier])
        end

        resolve_identifier(coefficient)
      end

      private

      attr_reader :variables

      def imaginary_numeric(coefficient)
        Complex(0, Term::IMAGINARY_NUMERIC_PATTERN.match(coefficient)[:real].to_f)
      end

      def signed_identifier_value(sign:, identifier:)
        { '+' => 1.0, '-' => -1.0 }.fetch(sign) * resolve_identifier(identifier)
      end

      def resolve_identifier(identifier)
        expression = resolved_expression(identifier)
        raise Error, "variable value must be concrete: #{identifier}" unless expression.concrete?

        expression.radians
      rescue AngleExpression::Error => e
        raise Error, e.message
      end

      def resolved_expression(identifier)
        resolved_value = variables.fetch(identifier) do
          raise Error, "unresolved initial state variable: #{identifier}"
        end
        AngleExpression.new(resolved_value)
      end
    end
  end
end
