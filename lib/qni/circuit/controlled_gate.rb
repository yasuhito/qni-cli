# frozen_string_literal: true

module Qni
  class Circuit
    # Describes a controlled gate by its controls, target, and target gate symbol.
    class ControlledGate
      def initialize(gate:, controls:, target:)
        @gate = gate
        @controls = controls
        @target = target
        validate
      end

      def symbols
        controls.to_h { |control| [control, CONTROL_SYMBOL] }.merge(target => gate)
      end

      private

      attr_reader :controls, :gate, :target

      def validate
        raise Error, 'control must not be empty' if controls.empty?
        raise Error, 'control must not contain duplicates' unless controls.uniq == controls
        raise Error, 'control and target must be different' if controls.include?(target)
      end
    end
  end
end
