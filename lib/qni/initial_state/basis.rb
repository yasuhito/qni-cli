# frozen_string_literal: true

module Qni
  class InitialState
    # Describes one supported basis label and its computational expansion.
    class Basis
      COMPUTATIONAL_PATTERN = /\A[01]+\z/

      def initialize(raw_basis)
        @basis = raw_basis.to_s
      end

      def value
        basis
      end

      def supported?
        qubit_count.positive?
      end

      def qubit_count
        return basis.length if computational_basis?
        return 2 if BellBasis.qubit_count_for(basis).positive?

        0
      end

      def components
        return [[basis.to_i(2), 1.0]] if computational_basis?

        BellBasis.components_for(basis)
      end

      def bell_shorthand?
        BellBasis.shorthand?(basis)
      end

      private

      attr_reader :basis

      def computational_basis?
        basis.match?(COMPUTATIONAL_PATTERN)
      end
    end
  end
end
