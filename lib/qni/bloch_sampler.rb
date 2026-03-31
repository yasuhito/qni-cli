# frozen_string_literal: true

require_relative 'angle_expression'
require_relative 'angled_gates'
require_relative 'initial_state'
require_relative 'simulator'
require_relative 'state_vector'

module Qni
  # Samples 1-qubit state evolution as Bloch vectors for rendering.
  class BlochSampler
    INTERMEDIATE_ANGLED_FRAMES = 12
    ANGLED_GATE_PATTERN = /\A(?<gate>P|Rx|Ry|Rz)\((?<angle>.+)\)\z/
    FIXED_PHASE_ROTATION_ANGLES = {
      'Z' => Math::PI,
      'S' => Math::PI / 2,
      'S†' => -(Math::PI / 2),
      'T' => Math::PI / 4,
      'T†' => -(Math::PI / 4)
    }.freeze

    def initialize(circuit_data)
      @data = circuit_data
    end

    def frames
      assert_single_qubit_circuit

      current_state = starting_state_vector
      [{ 'vector' => current_state.bloch_coordinates }] + sampled_frames_for(current_state)
    rescue AngleExpression::Error, InitialState::Error => e
      raise Simulator::Error, e.message
    end

    private

    attr_reader :data

    def sampled_frames_for(initial_state)
      current_state = initial_state

      data.fetch('cols').each_with_object([]) do |col, frames|
        next if col.all?(1)

        frames.concat(sample_col_frames(current_state, col))
        current_state = state_after_col(current_state, col)
      end
    end

    def sample_col_frames(current_state, col)
      gate = col.length == 1 ? col.fetch(0).to_s : nil
      partial_col = gate && interpolated_partial_col_for(gate)
      return sample_partial_frames(current_state, partial_col) if partial_col

      [{ 'vector' => state_after_col(current_state, col).bloch_coordinates }]
    end

    def interpolated_partial_col_for(gate)
      return angled_partial_col(gate) if ANGLED_GATE_PATTERN.match?(gate)

      total_angle = FIXED_PHASE_ROTATION_ANGLES[gate]
      return unless total_angle

      partial_angle = total_angle / INTERMEDIATE_ANGLED_FRAMES
      ["P(#{partial_angle})"]
    end

    def angled_partial_col(gate)
      gate_name, total_angle = parse_angled_gate(gate)
      partial_angle = total_angle / INTERMEDIATE_ANGLED_FRAMES
      ["#{gate_name}(#{partial_angle})"]
    end

    def parse_angled_gate(gate)
      match = ANGLED_GATE_PATTERN.match(gate.to_s)
      raise Simulator::Error, "unsupported gate for bloch sampling: #{gate.inspect}" unless match

      [match[:gate], AngleExpression.new(match[:angle]).radians(data.fetch('variables', {}))]
    end

    def starting_state_vector
      initial_state = data['initial_state']
      qubit_count = data.fetch('qubits')
      return StateVector.zero(qubit_count) unless initial_state

      StateVector.new(
        qubits: qubit_count,
        amplitudes: InitialState.from_h(initial_state).resolve_numeric(data.fetch('variables', {}))
      )
    end

    def state_after_col(state_vector, col)
      Simulator::StepOperation.new(col:, gate_operator_for: method(:gate_operator_for)).apply(state_vector)
    end

    def gate_operator_for(gate)
      return Simulator::FIXED_GATE_OPERATORS.fetch(gate) if Simulator::FIXED_GATE_OPERATORS.key?(gate)

      parsed_gate = AngledGates.parse(gate, variables: data.fetch('variables', {}))
      return parsed_gate if parsed_gate

      raise Simulator::Error, "unsupported gate for bloch sampling: #{gate.inspect}"
    end

    def assert_single_qubit_circuit
      return if data.fetch('qubits') == 1

      raise Simulator::Error, 'bloch currently supports only 1-qubit circuits'
    end

    def sample_partial_frames(current_state, partial_col)
      state = current_state

      Array.new(INTERMEDIATE_ANGLED_FRAMES) do
        state = state_after_col(state, partial_col)
        { 'vector' => state.bloch_coordinates }
      end
    end
  end
end
