# frozen_string_literal: true

module Qni
  class InitialState
    # Class-level parsing and basis helpers for initial states.
    module ClassMethods
      def supported_basis?(basis)
        basis_qubit_count(basis).positive?
      end

      def basis_qubit_count(basis)
        return basis.length if basis.match?(COMPUTATIONAL_BASIS_PATTERN)
        return 2 if BellBasis.qubit_count_for(basis).positive?

        0
      end

      def basis_components(basis)
        return [[basis.to_i(2), 1.0]] if basis.match?(COMPUTATIONAL_BASIS_PATTERN)

        BellBasis.components_for(basis)
      end

      def bell_shorthand?(basis)
        BellBasis.shorthand?(basis)
      end

      def zero
        new(terms: [Term.new(basis: '0', coefficient: '1')])
      end

      def from_h(data)
        format = data.fetch('format')
        raise Error, "unsupported initial state format: #{format}" unless format == FORMAT

        raw_terms = data.fetch('terms')
        raise Error, 'initial state must have at least one term' if raw_terms.empty?

        new(terms: raw_terms.map { |term| Term.from_h(term) })
      end

      def parse(raw_value)
        special_state_for(raw_value) || parse_ket_sum(raw_value)
      end

      def special_state_for(raw_value)
        normalized = raw_value.to_s.strip
        one_qubit_coefficient = ONE_QUBIT_SPECIAL_STATES[normalized]
        return superposition_state(one_qubit_coefficient) if one_qubit_coefficient

        bell_basis = BellBasis.basis_for_shorthand(normalized)
        bell_basis && bell_state(bell_basis)
      end

      def superposition_state(one_coefficient)
        new(
          terms: [
            Term.new(basis: '0', coefficient: PLUS_MINUS_COEFFICIENT_TEXT),
            Term.new(basis: '1', coefficient: one_coefficient)
          ]
        )
      end

      def bell_state(basis)
        new(terms: [Term.new(basis: basis, coefficient: '1')])
      end

      def normalize_text(raw_value)
        text = BellBasis.protect_shorthands(raw_value.to_s)
        normalized = text.gsub('α', 'alpha')
                         .gsub('β', 'beta')
                         .strip
                         .gsub(/\s+/, ' ')
                         .gsub(/\s*-\s*/, ' + -')
                         .gsub(/\s*\+\s*/, ' + ')
        BellBasis.restore_shorthands(normalized)
      end

      def parse_ket_sum(raw_value)
        normalized = normalize_text(raw_value)
        raise Error, 'initial state is required' if normalized.empty?

        new(terms: normalized.split(' + ').map { |term| Term.parse(term) })
      end
    end
  end
end
