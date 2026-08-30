import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sameAxisCorrelationPauliStrings } from '../../src/same_axis_correlations';

describe('same-axis correlation Pauli strings', () => {
  it('lists axes first and position combinations lexicographically', () => {
    assert.deepEqual(sameAxisCorrelationPauliStrings(3, 2), [
      'XXI', 'XIX', 'IXX',
      'YYI', 'YIY', 'IYY',
      'ZZI', 'ZIZ', 'IZZ'
    ]);
  });

  it('lists all one-body correlations', () => {
    assert.deepEqual(sameAxisCorrelationPauliStrings(2, 1), [
      'XI', 'IX', 'YI', 'IY', 'ZI', 'IZ'
    ]);
  });

  it('rejects body counts outside the qubit count', () => {
    assert.throws(() => sameAxisCorrelationPauliStrings(3, 4), {
      message: '--same-axis-correlations must not exceed the circuit qubit count'
    });
  });
});
