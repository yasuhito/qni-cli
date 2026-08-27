import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

describe('unnamed computational-basis measurement commands', () => {
  it('adds Qni-compatible Measure and runs one deterministic measurement', async () => {
    await withTempDir(async (dir) => {
      assert.equal(captureDispatcherRun(dir, ['add', 'X', '--qubit', '0', '--step', '0']).exitStatus, 0);
      assert.equal(captureDispatcherRun(dir, ['add', 'Measure', '--qubit', '0', '--step', '1']).exitStatus, 0);

      assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'circuit.json'), 'utf8')), {
        qubits: 1,
        cols: [['X'], ['Measure']]
      });
      assert.deepEqual(captureDispatcherRun(dir, ['run']), {
        exitStatus: 0,
        stderr: '',
        stdout: 'q0=1\n'
      });
    });
  });

  it('rejects control options because Measure is not a controlled gate', async () => {
    await withTempDir(async (dir) => {
      assert.deepEqual(
        captureDispatcherRun(dir, ['add', 'Measure', '--control', '0', '--qubit', '1', '--step', '0']),
        {
          exitStatus: 1,
          stderr: 'control is not supported for Measure\n',
          stdout: ''
        }
      );
    });
  });

  it('rejects symbolic state-vector output for a measurement circuit', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['Measure']]
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--symbolic']), {
        exitStatus: 1,
        stderr: '--symbolic cannot be used with a circuit containing measurements\n',
        stdout: ''
      });
    });
  });
});
