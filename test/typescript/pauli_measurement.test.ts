import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  groupPauliMeasurementSettings,
  samplePauliExpectationValues
} from '../../src/pauli_measurement';
import { seededRandom } from '../../src/random_seed';
import { Simulator } from '../../src/simulator';

describe('Pauli measurement settings', () => {
  it('groups qubit-wise commuting Pauli strings by first fit', () => {
    assert.deepEqual(groupPauliMeasurementSettings(['ZI', 'IZ', 'ZZ', 'XX', 'XI']), [
      { axes: 'ZZ', pauliStrings: ['ZI', 'IZ', 'ZZ'] },
      { axes: 'XX', pauliStrings: ['XX', 'XI'] }
    ]);
  });

  it('uses Z for axes that are identity in every Pauli string', () => {
    assert.deepEqual(groupPauliMeasurementSettings(['IXI']), [
      { axes: 'ZXZ', pauliStrings: ['IXI'] }
    ]);
  });

  it('rejects Pauli strings that represent different qubit counts', () => {
    assert.throws(() => groupPauliMeasurementSettings(['X', 'ZZ']), {
      message: 'Pauli strings must all have the same length'
    });
  });

  it('allows empty Pauli strings for a zero-qubit system', () => {
    assert.deepEqual(groupPauliMeasurementSettings(['', '']), [
      { axes: '', pauliStrings: ['', ''] }
    ]);
  });
});

describe('finite-shot Pauli expectation estimates', () => {
  const bellCircuit = { qubits: 2, cols: [['H', 1], ['•', 'X']] };

  it('returns deterministic Bell correlations and their standard errors', () => {
    const result = new Simulator(bellCircuit).estimateExpectationValues(
      ['ZZ', 'XX'],
      1000,
      seededRandom(42)
    );

    assert.deepEqual(result, {
      settings: [
        { axes: 'ZZ', pauliStrings: ['ZZ'] },
        { axes: 'XX', pauliStrings: ['XX'] }
      ],
      estimates: [
        { pauliString: 'ZZ', value: 1, stderr: 0 },
        { pauliString: 'XX', value: 1, stderr: 0 }
      ]
    });
  });

  it('uses the configured measurement basis for Pauli Y', () => {
    const result = new Simulator({ qubits: 1, cols: [['H'], ['S']] }).estimateExpectationValues(
      ['Y'],
      20,
      seededRandom(7)
    );

    assert.deepEqual(result.estimates, [{ pauliString: 'Y', value: 1, stderr: 0 }]);
  });

  it('uses one sampled bit string for every Pauli in a setting', () => {
    const result = new Simulator(bellCircuit).estimateExpectationValues(
      ['ZI', 'IZ', 'ZZ'],
      100,
      seededRandom(1)
    );

    assert.equal(result.settings.length, 1);
    assert.deepEqual(result.estimates, [
      { pauliString: 'ZI', value: 0.06, stderr: Math.sqrt((1 - 0.06 ** 2) / 100) },
      { pauliString: 'IZ', value: 0.06, stderr: Math.sqrt((1 - 0.06 ** 2) / 100) },
      { pauliString: 'ZZ', value: 1, stderr: 0 }
    ]);
  });

  it('reads each basis probability once before sampling many shots', () => {
    let probabilityReads = 0;
    const probabilities = new Proxy([0.25, 0.25, 0.25, 0.25], {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/u.test(property)) {
          probabilityReads += 1;
        }
        return Reflect.get(target, property, receiver);
      }
    });

    samplePauliExpectationValues(['ZI'], 1000, seededRandom(1), () => probabilities);

    assert.equal(probabilityReads, probabilities.length);
  });
});
