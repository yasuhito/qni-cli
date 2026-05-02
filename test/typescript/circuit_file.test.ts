import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { CircuitFile } from '../../src/circuit_file';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-circuit-file-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe('CircuitFile', () => {
  it('rejects negative qubit indices as missing slots', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      await writeFile(
        circuitPath,
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['H']]
          },
          null,
          2
        )}\n`
      );

      assert.throws(
        () => new CircuitFile(circuitPath).slotText(0, -1),
        /slot does not exist: cols\[0\]\[-1\]/u
      );
    });
  });
});
