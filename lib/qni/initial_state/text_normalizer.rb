# frozen_string_literal: true

module Qni
  class InitialState
    # Normalizes free-form ket-sum text before term parsing.
    class TextNormalizer
      def initialize(raw_value)
        @raw_value = raw_value
      end

      def normalize
        BellBasis.restore_shorthands(normalized_text)
      end

      private

      attr_reader :raw_value

      def normalized_text
        protected_text.gsub('α', 'alpha')
                      .gsub('β', 'beta')
                      .strip
                      .gsub(/\s+/, ' ')
                      .gsub(/\s*-\s*/, ' + -')
                      .gsub(/\s*\+\s*/, ' + ')
      end

      def protected_text
        BellBasis.protect_shorthands(raw_value.to_s)
      end
    end
  end
end
