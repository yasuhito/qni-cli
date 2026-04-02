# frozen_string_literal: true

require_relative 'cell'
require_relative 'text_step'

module Qni
  module View
    # Builds one normalized text-rendering layer from a serialized qni step.
    class TextStepLayerBuilder
      # Wraps one mutable layer of draw elements while preserving width rules.
      class TextLayer
        def initialize(qubits)
          @cells = Array.new(qubits) { EmptyWire.new }
        end

        def empty_wire_at?(qubit)
          fetch(qubit).is_a?(EmptyWire)
        end

        def fetch(qubit)
          @cells.fetch(qubit)
        end

        def normalize_width
          longest = @cells.map(&:length).max
          @cells.each { |cell| cell.layer_width = longest }
          self
        end

        def place_swap_endpoints(top_qubit, bottom_qubit)
          place(top_qubit, Ex.new(bot_connect: '│'))
          place(bottom_qubit, Ex.new(top_connect: '│'))
        end

        def place(qubit, cell)
          @cells[qubit] = cell
        end

        def to_a
          @cells
        end
      end

      # Captures the vertical span occupied by one controlled operation.
      class ControlSpan
        def initialize(control_qubits, target_qubit)
          @target_qubit = target_qubit
          @min_qubit, @max_qubit = (control_qubits + [target_qubit]).minmax
        end

        def bridge_qubits
          ((@min_qubit + 1)...@max_qubit)
        end

        def bullet_for(qubit)
          Bullet.new(top_connect: top_connect_for(qubit), bot_connect: bot_connect_for(qubit))
        end

        def target_connectors
          {
            top_connect: @target_qubit > @min_qubit ? '┴' : '─',
            bot_connect: @target_qubit < @max_qubit ? '┬' : '─'
          }
        end

        private

        def top_connect_for(qubit)
          qubit > @min_qubit ? '│' : ' '
        end

        def bot_connect_for(qubit)
          qubit < @max_qubit ? '│' : ' '
        end
      end

      # Applies one controlled operation onto a mutable text layer.
      class ControlledLayerPlacement
        def initialize(layer, step, target)
          @layer = layer
          @step = step
          @target = target
          @span = ControlSpan.new(step.control_qubits, target.qubit)
        end

        def apply
          place_control_bullets
          @target.place_on(@layer, **@span.target_connectors)
          place_control_bridges
        end

        private

        def place_control_bullets
          @step.control_qubits.each do |qubit|
            @layer.place(qubit, @span.bullet_for(qubit))
          end
        end

        def place_control_bridges
          @span.bridge_qubits.each do |qubit|
            @layer.place(qubit, VerticalBridge.new) if @step.empty_slot?(qubit)
          end
        end
      end

      def initialize(raw_step, qubits)
        @step = TextStep.new(raw_step)
        @qubits = qubits
      end

      def build
        populated_layer.normalize_width.to_a
      end

      private

      attr_reader :qubits, :step

      def populated_layer
        TextLayer.new(qubits).tap do |layer|
          place_swap(layer)
          place_controlled_gate(layer)
          place_single_gates(layer)
        end
      end

      def place_swap(layer)
        swap_pair = step.swap_pair
        return unless swap_pair

        top_qubit, bottom_qubit = swap_pair
        layer.place_swap_endpoints(top_qubit, bottom_qubit)
        place_swap_bridges(layer, top_qubit, bottom_qubit)
      end

      def place_swap_bridges(layer, top_qubit, bottom_qubit)
        ((top_qubit + 1)...bottom_qubit).each do |qubit|
          layer.place(qubit, VerticalBridge.new) if step.empty_slot?(qubit)
        end
      end

      def place_controlled_gate(layer)
        target = step.controlled_target
        return unless target

        ControlledLayerPlacement.new(layer, step, target).apply
      end

      def place_single_gates(layer)
        step.place_single_gates_on(layer)
      end
    end
  end
end
