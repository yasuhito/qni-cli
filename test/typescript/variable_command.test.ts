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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-variable-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function captureDispatcherRun(cwd: string, argv: string[]): CapturedRun {
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
      env: { PATH: '' },
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

describe('variable command TypeScript route', () => {
  it('lists variables without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        [
          '{',
          '  "qubits": 1,',
          '  "cols": [',
          '    ["Ry(theta)"]',
          '  ],',
          '  "variables": {',
          '    "theta": "π/4"',
          '  }',
          '}',
          ''
        ].join('\n')
      );

      const result = captureDispatcherRun(dir, ['variable', 'list']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, 'theta=π/4\n');
      assert.equal(result.stderr, '');
    });
  });

  it('sets variables in circuit.json without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, 'circuit.json'),
        [
          '{',
          '  "qubits": 1,',
          '  "cols": [',
          '    ["Ry(theta)"]',
          '  ]',
          '}',
          ''
        ].join('\n')
      );

      const result = captureDispatcherRun(dir, ['variable', 'set', 'theta', 'π/4']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '0\n');
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'circuit.json'), 'utf8')), {
        qubits: 1,
        cols: [['Ry(theta)']],
        variables: {
          theta: 'π/4'
        }
      });
    });
  });
});
