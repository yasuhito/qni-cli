import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Simulator } from '../../src/simulator';
import type { CircuitData } from '../../src/circuit_file';

describe('TypeScript numeric simulator compatibility', () => {
  it('renders numeric Bell state run and expectations', () => {
    const circuit: CircuitData = {
      cols: [['H', 1], ['•', 'X']],
      qubits: 2
    };
    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '0.7071067811865475,0.0,0.0,0.7071067811865475');
    assert.equal(simulator.renderExpectationValues(['ZZ', 'XX']), 'ZZ=1.0\nXX=1.0');
  });

  it('rounds a mixed complex LaTeX amplitude while preserving both signs', () => {
    const simulator = new Simulator({
      cols: [['X'], ['T'], ['T'], ['T']],
      qubits: 1
    });

    assert.equal(
      simulator.renderStateVectorLatex(),
      '(-0.707106781186547+0.707106781186548i)\\ket{1}'
    );
  });

  it('renders variables, initial_state, and angled gates', () => {
    const circuit: CircuitData = {
      cols: [['X'], ['Ry(2*theta)']],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [
          { basis: '0', coefficient: 'alpha' },
          { basis: '1', coefficient: 'beta' }
        ]
      },
      qubits: 1,
      variables: {
        alpha: '0.6',
        beta: '0.8',
        theta: 'π/4'
      }
    };
    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '0.14142135623730967,0.9899494936611666');
    assert.equal(simulator.renderExpectationValues(['X', 'Z']), 'X=0.28000000000000036\nZ=-0.9600000000000001');
  });

  it('applies a single global phase to every amplitude', () => {
    const circuit: CircuitData = {
      cols: [['H'], ['GlobalPhase(2π)']],
      qubits: 1
    };
    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '-0.7071067811865475,-0.7071067811865475');
  });

  it('applies a controlled global phase as a relative phase', () => {
    const circuit: CircuitData = {
      cols: [['H', 1], ['•', 'GlobalPhase(2π)']],
      qubits: 2
    };
    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '0.7071067811865475,0.0,-0.7071067811865475,0.0');
  });

  it('extends a shorter initial_state with zeroed suffix qubits', () => {
    const circuit: CircuitData = {
      cols: [[1, 'X']],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [
          { basis: '0', coefficient: '0.7071067811865476' },
          { basis: '1', coefficient: '0.7071067811865476' }
        ]
      },
      qubits: 2
    };

    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '0.0,0.7071067811865476,0.0,0.7071067811865476');
    assert.equal(simulator.renderExpectationValues(['IZ']), 'IZ=-1.0');
  });

  it('applies controlled SWAP only when all controls are active', () => {
    const controlledSwap = [['•', 'Swap', 'Swap']];

    assert.equal(
      new Simulator({
        cols: controlledSwap,
        initial_state: {
          format: 'ket_sum_v1',
          terms: [{ basis: '101', coefficient: '1' }]
        },
        qubits: 3
      }).renderStateVector(),
      '0.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0'
    );

    assert.equal(
      new Simulator({
        cols: controlledSwap,
        initial_state: {
          format: 'ket_sum_v1',
          terms: [{ basis: '001', coefficient: '1' }]
        },
        qubits: 3
      }).renderStateVector(),
      '0.0,1.0,0.0,0.0,0.0,0.0,0.0,0.0'
    );
  });

  it('measures by probability, collapses the state, and uses it in later operations', () => {
    const circuit: CircuitData = {
      cols: [['H'], ['Measure'], ['X'], ['Measure']],
      qubits: 1
    };

    assert.deepEqual(new Simulator(circuit).runMeasurements(() => 0.25), [
      { qubit: 0, value: 0 },
      { qubit: 0, value: 1 }
    ]);
    assert.deepEqual(new Simulator(circuit).runMeasurements(() => 0.75), [
      { qubit: 0, value: 1 },
      { qubit: 0, value: 0 }
    ]);
  });

  it('runs an independent controlled gate and measurement in the same step', () => {
    const circuit: CircuitData = {
      cols: [['•', 'X', 'Measure'], [1, 'Measure', 1]],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [{ basis: '100', coefficient: '1' }]
      },
      qubits: 3
    };

    assert.deepEqual(new Simulator(circuit).runMeasurements(() => 0.5), [
      { qubit: 2, value: 0 },
      { qubit: 1, value: 1 }
    ]);
  });

  it('runs an independent SWAP and measurement in the same step', () => {
    const circuit: CircuitData = {
      cols: [['Swap', 'Swap', 'Measure'], [1, 'Measure', 1]],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [{ basis: '100', coefficient: '1' }]
      },
      qubits: 3
    };

    assert.deepEqual(new Simulator(circuit).runMeasurements(() => 0.5), [
      { qubit: 2, value: 0 },
      { qubit: 1, value: 1 }
    ]);
  });

  it('rejects qubit counts that would overflow JavaScript bitwise state indexing', () => {
    const circuit: CircuitData = {
      cols: [],
      qubits: 32
    };

    assert.throws(
      () => new Simulator(circuit).renderStateVector(),
      /too many qubits for TypeScript numeric run: 32/u
    );
  });
});
