import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-state-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function captureDispatcherRun(
  cwd: string,
  argv: string[],
  env: NodeJS.ProcessEnv = { PATH: '' }
): CapturedRun {
  let stdout = '';
  let stderr = '';
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean => {
    stdout += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean => {
    stderr += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stderr.write;

  try {
    const dispatcher = createDispatcher({
      cwd,
      env,
      projectRoot: process.cwd()
    });

    return {
      exitStatus: dispatcher.run(argv),
      stderr,
      stdout
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

describe('state command TypeScript route', () => {
  it('sets a ket-sum initial state without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      const result = captureDispatcherRun(dir, ['state', 'set', 'alpha|0> + beta|1>']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '0\n');
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(await readFile(circuitPath, 'utf8')), {
        qubits: 1,
        cols: [[1]],
        initial_state: {
          format: 'ket_sum_v1',
          terms: [
            { basis: '0', coefficient: 'alpha' },
            { basis: '1', coefficient: 'beta' }
          ]
        }
      });
    });
  });

  it('round-trips one-qubit shorthand through state show', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      const setResult = captureDispatcherRun(dir, ['state', 'set', '|+>']);
      const showResult = captureDispatcherRun(dir, ['state', 'show']);

      assert.equal(setResult.exitStatus, 0);
      assert.equal(setResult.stdout, '0\n');
      assert.equal(setResult.stderr, '');
      assert.equal(showResult.exitStatus, 0);
      assert.equal(showResult.stdout, '|+>\n');
      assert.equal(showResult.stderr, '');
      assert.deepEqual(JSON.parse(await readFile(circuitPath, 'utf8')), {
        qubits: 1,
        cols: [[1]],
        initial_state: {
          format: 'ket_sum_v1',
          terms: [
            { basis: '0', coefficient: Math.sqrt(0.5).toString() },
            { basis: '1', coefficient: Math.sqrt(0.5).toString() }
          ]
        }
      });
    });
  });

  it('sets Bell-basis shorthand with Ruby-compatible coefficient normalization', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      const result = captureDispatcherRun(dir, ['state', 'set', 'α|Φ+> + β|Φ->']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '0\n');
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(await readFile(circuitPath, 'utf8')), {
        qubits: 2,
        cols: [[1, 1]],
        initial_state: {
          format: 'ket_sum_v1',
          terms: [
            { basis: 'Φ+', coefficient: 'alpha' },
            { basis: 'Φ-', coefficient: 'beta' }
          ]
        }
      });
    });
  });

  it('rejects invalid state expressions with the Ruby oracle message', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['state', 'set', 'foo']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'invalid initial state term: foo\n');
    });
  });

  it('shows a stored initial state without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [[1]],
            initial_state: {
              format: 'ket_sum_v1',
              terms: [
                { basis: '0', coefficient: 'alpha' },
                { basis: '1', coefficient: 'beta' }
              ]
            }
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['state', 'show']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, 'alpha|0> + beta|1>\n');
      assert.equal(result.stderr, '');
    });
  });

  it('clears only the stored initial state without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      await writeFile(
        circuitPath,
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['Ry(theta)']],
            initial_state: {
              format: 'ket_sum_v1',
              terms: [
                { basis: '0', coefficient: 'alpha' },
                { basis: '1', coefficient: 'beta' }
              ]
            },
            variables: {
              theta: 'π/4'
            }
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['state', 'clear']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '0\n');
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(await readFile(circuitPath, 'utf8')), {
        qubits: 1,
        cols: [['Ry(theta)']],
        variables: {
          theta: 'π/4'
        }
      });
    });
  });

  it('honors QNI_USE_RUBY for state set', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['state', 'set', '1|0>'], { PATH: '', QNI_USE_RUBY: '1' });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('honors QNI_USE_RUBY for migrated state subcommands', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['state', 'show'], { PATH: '', QNI_USE_RUBY: '1' });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
