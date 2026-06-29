import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

const HELP_TEXT = `qni commands:
  qni add       # Add a gate to the circuit
  qni bloch     # Render the current 1-qubit state on the Bloch sphere
  qni clear     # Delete the current circuit file
  qni expect    # Show expectation values of Pauli strings
  qni export    # Export the circuit as qcircuit LaTeX or PNG
  qni gate      # Show the gate at a circuit slot
  qni rm        # Remove a gate from the circuit
  qni run       # Show the state vector of the circuit
  qni state     # Manage the initial state vector
  qni variable  # Manage symbolic angle variables
  qni view      # Render the circuit as ASCII art
`;

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-help-'));

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

describe('top-level help TypeScript route', () => {
  it('prints the command list through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, []);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, HELP_TEXT);
      assert.equal(result.stderr, '');
    });
  });

  it('prints the command list for --help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, HELP_TEXT);
      assert.equal(result.stderr, '');
    });
  });

  it('rejects qni help subcommands like the Ruby command', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['help', 'add']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'qni help is not available; use qni or qni COMMAND --help\n');
    });
  });

  it('rejects unknown commands through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['__missing_command__'], { PATH: '' });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'Could not find command "__missing_command__".\n');
    });
  });
});
