# frozen_string_literal: true

module Qni
  class InitialState
    # Bell-basis shorthand and expansion helpers for 2-qubit initial states.
    module BellBasis
      FACTOR = Math.sqrt(0.5)
      PLACEHOLDERS = {
        'Φ+' => '__QNI_BELL_PHI_PLUS__',
        'Φ-' => '__QNI_BELL_PHI_MINUS__',
        'Ψ+' => '__QNI_BELL_PSI_PLUS__',
        'Ψ-' => '__QNI_BELL_PSI_MINUS__'
      }.freeze
      COMPONENTS = {
        'Φ+' => [[0, FACTOR], [3, FACTOR]],
        'Φ-' => [[0, FACTOR], [3, -FACTOR]],
        'Ψ+' => [[1, FACTOR], [2, FACTOR]],
        'Ψ-' => [[1, FACTOR], [2, -FACTOR]]
      }.freeze
      SHORTHANDS = {
        '|Φ+>' => 'Φ+',
        '|Φ->' => 'Φ-',
        '|Ψ+>' => 'Ψ+',
        '|Ψ->' => 'Ψ-'
      }.freeze

      module_function

      def basis_for_shorthand(text)
        SHORTHANDS[text.to_s.strip]
      end

      def shorthand?(basis)
        COMPONENTS.key?(basis)
      end

      def supported_basis?(basis)
        COMPONENTS.key?(basis)
      end

      def qubit_count_for(basis)
        supported_basis?(basis) ? 2 : 0
      end

      def components_for(basis)
        COMPONENTS.fetch(basis)
      end

      def protect_shorthands(text)
        PLACEHOLDERS.reduce(text) do |current, (basis, placeholder)|
          current.gsub("|#{basis}>", placeholder)
        end
      end

      def restore_shorthands(text)
        PLACEHOLDERS.reduce(text) do |current, (basis, placeholder)|
          current.gsub(placeholder, "|#{basis}>")
        end
      end
    end
  end
end
