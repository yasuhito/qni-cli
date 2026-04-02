# frozen_string_literal: true

module Qni
  class InitialState
    # Class-level parsing and basis helpers for initial states.
    module ClassMethods
      def zero
        new(terms: [Term.new(basis: '0', coefficient: '1')])
      end

      def from_h(data)
        new(terms: HashLoader.new(data).terms)
      end

      def parse(raw_value)
        SpecialStateParser.new(raw_value).parse || parse_ket_sum(raw_value)
      end

      def parse_ket_sum(raw_value)
        normalized = TextNormalizer.new(raw_value).normalize
        raise Error, 'initial state is required' if normalized.empty?

        new(terms: normalized.split(' + ').map { |term| Term.parse(term) })
      end
    end
  end
end
