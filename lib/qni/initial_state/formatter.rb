# frozen_string_literal: true

module Qni
  class InitialState
    # Formats an InitialState into qni's preferred shorthand string when possible.
    class Formatter
      COEFFICIENT = Math.sqrt(0.5).to_s
      ONE_QUBIT_SPECIAL_LABELS = {
        [COEFFICIENT, COEFFICIENT] => '|+>',
        [COEFFICIENT, "-#{COEFFICIENT}"] => '|->',
        [COEFFICIENT, "#{COEFFICIENT}i"] => '|+i>',
        [COEFFICIENT, "-#{COEFFICIENT}i"] => '|-i>'
      }.freeze

      def initialize(terms)
        @terms = terms
      end

      def to_s
        one_qubit_special_label || bell_basis_label || ket_sum
      end

      private

      attr_reader :terms

      def one_qubit_special_label
        return unless one_qubit_special_terms?

        ONE_QUBIT_SPECIAL_LABELS[terms.map(&:coefficient)]
      end

      def one_qubit_special_terms?
        terms.length == 2 && terms.map(&:basis) == %w[0 1]
      end

      def bell_basis_label
        return unless terms.length == 1

        terms.first.bell_basis_label
      end

      def ket_sum
        terms.join(' + ').gsub('+ -', '- ')
      end
    end
  end
end
