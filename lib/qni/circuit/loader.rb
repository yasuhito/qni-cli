# frozen_string_literal: true

module Qni
  class Circuit
    # Builds validated Circuit constructor arguments from hashes and empty-circuit requests.
    class Loader
      def self.attributes_from(data)
        qubits = validated_qubits(data.fetch('qubits'))
        initial_state_data = data['initial_state']

        {
          qubits:,
          steps: validated_steps(data.fetch('cols'), qubits),
          variables: VariableStore.build(data.fetch('variables', {})),
          initial_state: initial_state_data && InitialState.from_h(initial_state_data)
        }
      end

      def self.empty_attributes(step:, qubit:)
        qubits = qubit + 1
        {
          qubits:,
          steps: Array.new(step + 1) { Step.empty(qubits) },
          variables: VariableStore.empty,
          initial_state: nil
        }
      end

      def self.validate_qubits!(qubits)
        return if qubits.is_a?(Integer) && qubits.positive?

        raise Error, 'qubits must be a positive integer'
      end

      def self.validated_qubits(qubits)
        validate_qubits!(qubits)
        qubits
      end

      def self.validated_steps(cols, qubits)
        validate_cols(cols, qubits).map { |col| Step.from_a(col) }
      end

      def self.validate_cols(cols, qubits)
        StepWidthValidator.new(qubits).validate_raw_cols(cols)
        cols
      end
    end
  end
end
