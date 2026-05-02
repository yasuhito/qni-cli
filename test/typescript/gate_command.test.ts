import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-gate-'));

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

describe('gate command TypeScript route', () => {
  it('shows the stored gate without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['H']]
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['gate', '--qubit', '0', '--step', '0']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, 'H\n');
      assert.equal(result.stderr, '');
    });
  });

  it('accepts plus-prefixed indices like Ruby without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['H']]
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['gate', '--qubit', '+0', '--step', '+0']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, 'H\n');
      assert.equal(result.stderr, '');
    });
  });

  it('reports Ruby-compatible slot errors without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['H']]
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['gate', '--qubit', '0', '--step', '1']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'slot does not exist: cols[1][0]\n');
    });
  });

  it('rejects decimal qubit values like Ruby without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        `${JSON.stringify(
          {
            qubits: 1,
            cols: [['H']]
          },
          null,
          2
        )}\n`
      );

      const result = captureDispatcherRun(dir, ['gate', '--qubit', '1.0', '--step', '0']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'qubit must be an integer\n');
    });
  });

  it('honors QNI_USE_RUBY for gate', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['gate', '--qubit', '0', '--step', '0'], {
        PATH: '',
        QNI_USE_RUBY: '1'
      });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
