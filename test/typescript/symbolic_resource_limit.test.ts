import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSymbolicLatexFallbackError,
  renderSymbolicStateVector,
  SymbolicStateRendererError
} from '../../src/symbolic_state_renderer';

function fullySuperposedCircuit(
  qubits: number,
  superposedQubits = qubits
): { cols: unknown[][]; qubits: number } {
  return {
    cols: Array.from({ length: superposedQubits }, (_, target) =>
      Array.from({ length: qubits }, (_, qubit) => (qubit === target ? 'H' : 1))
    ),
    qubits
  };
}

describe('symbolic state resource limit', () => {
  it('accepts helper output above the Node.js default one-megabyte buffer', () => {
    const output = renderSymbolicStateVector({
      circuit: fullySuperposedCircuit(15),
      format: 'latex-exact',
      projectRoot: process.cwd()
    });

    assert.ok(Buffer.byteLength(output) > 1024 * 1024);
    assert.match(output, /\\ket\{111111111111111\}$/u);
  });

  it('rejects a huge ket before allocating its basis label', () => {
    assert.throws(
      () =>
        renderSymbolicStateVector({
          circuit: { cols: [], qubits: 1_000_000_000 },
          format: 'latex-exact',
          projectRoot: process.cwd()
        }),
      (error: unknown) => {
        assert.ok(error instanceof SymbolicStateRendererError);
        assert.equal(error.message, 'symbolic output exceeds 8388608 bytes');
        return true;
      }
    );
  });

  it('stops while accumulating a multi-term output above the byte limit', () => {
    assert.throws(
      () =>
        renderSymbolicStateVector({
          circuit: fullySuperposedCircuit(100, 16),
          format: 'latex-exact',
          projectRoot: process.cwd()
        }),
      (error: unknown) => {
        assert.ok(error instanceof SymbolicStateRendererError);
        assert.equal(error.message, 'symbolic output exceeds 8388608 bytes');
        return true;
      }
    );
  });

  it('does not treat output resource limits as numeric fallback errors', () => {
    assert.equal(
      isSymbolicLatexFallbackError(new SymbolicStateRendererError('symbolic output exceeds 8388608 bytes')),
      false
    );
  });

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
        assert.equal(isSymbolicLatexFallbackError(error), false);
        return true;
      }
    );
  });
});
