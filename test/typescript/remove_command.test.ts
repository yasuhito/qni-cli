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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-rm-'));

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

  process.stderr.write = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: BufferEncoding | ((error?: Error | null) => void)): boolean => {
    stderr += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (typeof callback === 'function') {
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

async function writeCircuit(dir: string, circuit: unknown): Promise<string> {
  const circuitPath = path.join(dir, 'circuit.json');
  await writeFile(circuitPath, `${JSON.stringify(circuit, null, 2)}\n`);

  return circuitPath;
}

async function readCircuit(circuitPath: string): Promise<unknown> {
  return JSON.parse(await readFile(circuitPath, 'utf8'));
}

describe('rm command TypeScript route', () => {
  it('removes a single-qubit gate without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['rm', '--qubit', '0', '--step', '0']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.deepEqual(await readCircuit(circuitPath), {
        qubits: 1,
        cols: [[1]]
      });
    });
  });

  it('removes a controlled operation when the target is selected', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = await writeCircuit(dir, {
        qubits: 2,
        cols: [['•', 'X']]
      });

      const result = captureDispatcherRun(dir, ['rm', '--qubit', '1', '--step', '0']);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(await readCircuit(circuitPath), {
        qubits: 1,
        cols: [[1]]
      });
    });
  });

  it('removes a SWAP operation when one Swap slot is selected', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = await writeCircuit(dir, {
        qubits: 2,
        cols: [['Swap', 'Swap']]
      });

      const result = captureDispatcherRun(dir, ['rm', '--qubit', '0', '--step', '0']);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(await readCircuit(circuitPath), {
        qubits: 1,
        cols: [[1]]
      });
    });
  });

  it('reports empty slots without mutating circuit.json', async () => {
    await withTempDir(async (dir) => {
      const originalCircuit = {
        qubits: 2,
        cols: [['H', 1]]
      };
      const circuitPath = await writeCircuit(dir, originalCircuit);

      const result = captureDispatcherRun(dir, ['rm', '--qubit', '1', '--step', '0']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'slot is empty: cols[0][1]\n');
      assert.deepEqual(await readCircuit(circuitPath), originalCircuit);
    });
  });

  it('honors QNI_USE_RUBY for rm', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['rm', '--qubit', '0', '--step', '0'], {
        PATH: '',
        QNI_USE_RUBY: '1'
      });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
