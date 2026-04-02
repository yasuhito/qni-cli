# frozen_string_literal: true

module Qni
  class InitialState
    # Single term in an initial-state ket sum.
    class Term
      TERM_PATTERN = /\A(?<coefficient>.+)\|(?<basis>[^>]+)>\z/
      SIGNED_IDENTIFIER_PATTERN = /\A(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\z/
      IMAGINARY_NUMERIC_PATTERN = /\A(?<real>[+-]?\d+(?:\.\d+)?)i\z/

      def self.from_h(data)
        new(
          basis: validated_basis(data.fetch('basis')),
          coefficient: validated_coefficient(data.fetch('coefficient'))
        )
      end

      def self.parse(raw_value)
        match = TERM_PATTERN.match(raw_value)
        raise Error, "invalid initial state term: #{raw_value}" unless match

        new(
          basis: validated_basis(match[:basis]),
          coefficient: validated_coefficient(match[:coefficient])
        )
      end

      def self.validated_basis(raw_basis)
        basis = Basis.new(raw_basis)
        basis_value = basis.value
        return basis_value if basis.supported?

        raise Error, "unsupported basis state: #{basis_value}"
      end

      def self.validated_coefficient(raw_coefficient)
        coefficient = raw_coefficient.to_s.strip
        return coefficient if supported_coefficient?(coefficient)

        raise Error, "invalid initial state coefficient: #{coefficient}"
      end

      def self.supported_coefficient?(coefficient)
        [
          AngleExpression::IDENTIFIER_PATTERN,
          SIGNED_IDENTIFIER_PATTERN,
          AngleExpression::NUMERIC_PATTERN,
          IMAGINARY_NUMERIC_PATTERN
        ].any? { |pattern| coefficient.match?(pattern) }
      end

      attr_reader :basis, :coefficient

      def initialize(basis:, coefficient:)
        @basis = basis
        @coefficient = coefficient
      end

      def to_h
        { 'basis' => basis, 'coefficient' => coefficient }
      end

      def add_to_amplitudes(amplitudes, resolved_coefficient)
        Basis.new(basis).components.each do |index, scale|
          amplitudes[index] += resolved_coefficient * scale
        end
      end

      def bell_basis_label
        return unless coefficient == '1'
        return unless Basis.new(basis).bell_shorthand?

        "|#{basis}>"
      end

      def to_s
        "#{coefficient}|#{basis}>"
      end
    end
  end
end
