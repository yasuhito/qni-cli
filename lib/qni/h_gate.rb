# frozen_string_literal: true

module Qni
  class HGate
    MATRIX = [
      [1.0 / Math.sqrt(2), 1.0 / Math.sqrt(2)].freeze,
      [1.0 / Math.sqrt(2), -1.0 / Math.sqrt(2)].freeze
    ].freeze

    SYMBOL = 'H'

    def self.apply(zero_amplitude, one_amplitude)
      [
        row_value(MATRIX.fetch(0), zero_amplitude, one_amplitude),
        row_value(MATRIX.fetch(1), zero_amplitude, one_amplitude)
      ]
    end

    def self.row_value(row, zero_amplitude, one_amplitude)
      (row.fetch(0) * zero_amplitude) + (row.fetch(1) * one_amplitude)
    end
    private_class_method :row_value
  end
end
