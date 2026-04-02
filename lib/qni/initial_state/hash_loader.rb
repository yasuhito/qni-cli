# frozen_string_literal: true

module Qni
  class InitialState
    # Loads an InitialState instance from serialized hash data.
    class HashLoader
      def initialize(data)
        @data = data
      end

      def terms
        ensure_supported_format
        ensure_terms_present

        raw_terms.map { |term| Term.from_h(term) }
      end

      private

      attr_reader :data

      def format
        data.fetch('format')
      end

      def raw_terms
        data.fetch('terms')
      end

      def ensure_supported_format
        return if format == FORMAT

        raise Error, "unsupported initial state format: #{format}"
      end

      def ensure_terms_present
        raise Error, 'initial state must have at least one term' if raw_terms.empty?
      end
    end
  end
end
