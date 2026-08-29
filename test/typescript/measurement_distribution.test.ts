import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

describe('measurement distributions', () => {
  it('restarts the circuit for every shot and aggregates every measurement as a joint result', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [['X', 1], ['Measure>prepared', 1], [1, 'Measure']]
      });

      const output = captureDispatcherRun(dir, ['run', '--shots', '3']);
      assert.equal(output.exitStatus, 0);
      assert.equal(output.stderr, '');
      assert.match(output.stdout, /^shots=3 seed=\d+\nprepared \| q1 \| count\n1        \| 0  \| 3\n$/u);
    });
  });

  it('returns the same joint distribution for the same seed', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H'], ['Measure>result']]
      });

      const first = captureDispatcherRun(dir, ['run', '--shots', '20', '--seed', '314159', '--json']);
      const second = captureDispatcherRun(dir, ['run', '--shots', '20', '--seed', '314159', '--json']);

      assert.equal(first.exitStatus, 0);
      assert.deepEqual(second, first);
    });
  });

  it('includes an explicit seed in the table summary when shots are omitted', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['Measure']]
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--seed', '42']), {
        exitStatus: 0,
        stderr: '',
        stdout: 'shots=1 seed=42\nq0 | count\n0  | 1\n'
      });
    });
  });

  it('keeps an explicit classical bit name when it collides with an unnamed measurement label', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['Measure'], ['Measure>q0']]
      });

      const output = captureDispatcherRun(dir, ['run', '--shots', '1', '--seed', '42', '--json']);
      assert.equal(output.exitStatus, 0);
      assert.deepEqual(JSON.parse(output.stdout), {
        shots: 1,
        seed: 42,
        classicalBits: ['q0#2', 'q0'],
        results: [{ values: { 'q0#2': 0, q0: 0 }, count: 1 }]
      });
    });
  });

  it('reports a generated seed that reproduces the complete JSON output', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H'], ['Measure']]
      });

      const first = captureDispatcherRun(dir, ['run', '--shots', '20', '--json']);
      assert.equal(first.exitStatus, 0);
      const seed = JSON.parse(first.stdout).seed as unknown;
      assert.equal(Number.isInteger(seed), true);
      assert.ok((seed as number) >= 0 && (seed as number) <= 0xffffffff);

      const replay = captureDispatcherRun(dir, ['run', '--shots', '20', '--seed', String(seed), '--json']);
      assert.deepEqual(replay, first);
    });
  });

  it('reports a generated seed that reproduces the complete table output', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H'], ['Measure']]
      });

      const first = captureDispatcherRun(dir, ['run', '--shots', '20']);
      assert.equal(first.exitStatus, 0);
      const seed = /^shots=20 seed=(\d+)$/mu.exec(first.stdout)?.[1];
      assert.notEqual(seed, undefined);

      const replay = captureDispatcherRun(dir, ['run', '--shots', '20', '--seed', seed as string]);
      assert.deepEqual(replay, first);
    });
  });

  it('rejects invalid shot counts and seeds with option-specific errors', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['Measure']] });

      for (const value of ['0', '-1', '1.5', 'word']) {
        assert.equal(
          captureDispatcherRun(dir, ['run', '--shots', value]).stderr,
          '--shots must be a positive integer\n'
        );
      }
      for (const value of ['-1', '1.5', '4294967296', 'word']) {
        assert.equal(
          captureDispatcherRun(dir, ['run', '--seed', value]).stderr,
          '--seed must be an integer between 0 and 4294967295\n'
        );
      }
    });
  });
});
