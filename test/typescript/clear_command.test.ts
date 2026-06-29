import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

const HELP_TEXT = `Usage:
  qni clear

Overview:
  Delete ./circuit.json.
  If ./circuit.json does not exist, qni clear still succeeds.
  Standard output is empty on success.

Examples:
  qni clear
`;

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-clear-'));

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

async function circuitExists(dir: string): Promise<boolean> {
  try {
    await access(path.join(dir, 'circuit.json'), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe('clear command TypeScript route', () => {
  it('deletes circuit.json through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      await writeFile(circuitPath, '{"qubits":1,"cols":[["H"]]}\n');

      const result = captureDispatcherRun(dir, ['clear']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(await circuitExists(dir), false);
    });
  });

  it('succeeds without creating circuit.json when it does not exist', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(await circuitExists(dir), false);
    });
  });

  it('prints clear help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear', '--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, HELP_TEXT);
      assert.equal(result.stderr, '');
    });
  });

  it('rejects extra arguments like the Ruby command', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear', '--bad', 'foo']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(
        result.stderr,
        'ERROR: "qni clear" was called with arguments ["--bad", "foo"]\nUsage: "qni clear"\n'
      );
    });
  });
});
