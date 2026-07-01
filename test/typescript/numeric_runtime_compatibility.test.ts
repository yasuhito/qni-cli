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
