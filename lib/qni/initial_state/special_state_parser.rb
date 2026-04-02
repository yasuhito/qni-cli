# frozen_string_literal: true

module Qni
  class InitialState
    # Parses shorthand notations like |+>, |-i>, and Bell-state labels.
    class SpecialStateParser
      COEFFICIENT = Math.sqrt(0.5).to_s
      ONE_QUBIT_SPECIAL_STATES = {
        '|+>' => COEFFICIENT,
        '|->' => "-#{COEFFICIENT}",
        '|+i>' => "#{COEFFICIENT}i",
        '|-i>' => "-#{COEFFICIENT}i"
      }.freeze

      def initialize(raw_value)
        @text = raw_value.to_s.strip
      end

      def parse
        one_qubit_state || bell_state
      end

      private

      attr_reader :text

      def bell_state
        basis = BellBasis.basis_for_shorthand(text)
        return unless basis

        InitialState.new(terms: [Term.new(basis:, coefficient: '1')])
      end

      def one_qubit_state
        one_coefficient = ONE_QUBIT_SPECIAL_STATES[text]
        return unless one_coefficient

        InitialState.new(
          terms: [
            Term.new(basis: '0', coefficient: COEFFICIENT),
            Term.new(basis: '1', coefficient: one_coefficient)
          ]
        )
      end
    end
  end
end
