# frozen_string_literal: true

module Qni
  class InitialState
    # Computes the squared magnitude of one numeric amplitude.
    class AmplitudeNorm
      def initialize(amplitude)
        @amplitude = amplitude
      end

      def value
        return amplitude.abs2 if amplitude.is_a?(Complex)

        amplitude**2
      end

      private

      attr_reader :amplitude
    end
  end
end
