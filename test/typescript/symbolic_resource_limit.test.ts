import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSymbolicLatexFallbackError,
  renderSymbolicStateVector,
  SymbolicStateRendererError
} from '../../src/symbolic_state_renderer';

function fullySuperposedCircuit(qubits: number): { cols: unknown[][]; qubits: number } {
  return {
    cols: Array.from({ length: qubits }, (_, target) =>
      Array.from({ length: qubits }, (_, qubit) => (qubit === target ? 'H' : 1))
    ),
    qubits
  };
}

describe('symbolic state resource limit', () => {
  it('stops the actual helper before exceeding the sparse-state term limit', () => {
    assert.throws(
      () =>
        renderSymbolicStateVector({
          circuit: fullySuperposedCircuit(17),
          format: 'latex-exact',
          projectRoot: process.cwd()
        }),
      (error: unknown) => {
        assert.ok(error instanceof SymbolicStateRendererError);
        assert.equal(error.message, 'symbolic state exceeds 65536 nonzero terms');
        assert.equal(isSymbolicLatexFallbackError(error), true);
        return true;
      }
    );
  });
});
