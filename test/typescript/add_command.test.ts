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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-add-'));

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

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean => {
    stdout += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: BufferEncoding | ((error?: Error | null) => void)
  ): boolean => {
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

describe('add command TypeScript route', () => {
  it('adds fixed single-qubit gates without invoking Ruby fallback', async () => {
    const examples = [
      ['H', 'H'],
      ['X', 'X'],
      ['Y', 'Y'],
      ['Z', 'Z'],
      ['S', 'S'],
      ['S†', 'S†'],
      ['T', 'T'],
      ['T†', 'T†'],
      ['√X', 'X^½']
    ];

    for (const [gate, storedGate] of examples) {
      await withTempDir(async (dir) => {
        const result = captureDispatcherRun(dir, ['add', gate, '--qubit', '0', '--step', '0']);

        assert.equal(result.exitStatus, 0);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, '');
        assert.deepEqual(await readCircuit(path.join(dir, 'circuit.json')), {
          qubits: 1,
          cols: [[storedGate]]
        });
      });
    }
  });

  it('auto-expands and normalizes leading empty steps like Ruby', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'H', '--qubit', '0', '--step', '1']);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(await readCircuit(path.join(dir, 'circuit.json')), {
        qubits: 1,
        cols: [['H']]
      });
    });
  });

  it('auto-expands and normalizes leading empty qubits like Ruby', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'H', '--qubit', '1', '--step', '0']);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(await readCircuit(path.join(dir, 'circuit.json')), {
        qubits: 1,
        cols: [['H']]
      });
    });
  });

  it('reports occupied slots without mutating circuit.json', async () => {
    await withTempDir(async (dir) => {
      const originalCircuit = {
        qubits: 1,
        cols: [['H']]
      };
      const circuitPath = await writeCircuit(dir, originalCircuit);

      const result = captureDispatcherRun(dir, ['add', 'X', '--qubit', '0', '--step', '0']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'target slot is occupied: cols[0][0] = "H"\n');
      assert.deepEqual(await readCircuit(circuitPath), originalCircuit);
    });
  });

  it('leaves angled gates on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'Ry', '--angle', 'theta', '--qubit', '0', '--step', '0']);

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('leaves controlled gates on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'X', '--control', '0', '--qubit', '1', '--step', '0']);

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('leaves SWAP on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'SWAP', '--qubit', '0,1', '--step', '0']);

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('leaves unknown option handling on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'H', '--qubit', '0', '--step', '0', '--unexpected']);

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('rejects malformed fixed gate options without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'H', '--qubit', '--step', '0']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'unknown option: 0\n');
    });
  });

  it('honors QNI_USE_RUBY for add', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['add', 'H', '--qubit', '0', '--step', '0'], {
        PATH: '',
        QNI_USE_RUBY: '1'
      });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
