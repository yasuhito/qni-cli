import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { Complex } from '../../src/complex';
import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-expect-'));

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

async function writeCircuit(
  dir: string,
  circuit: unknown = { qubits: 1, cols: [[1]] }
): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

describe('expect command TypeScript route', () => {
  it('prints expect help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['expect']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^Usage:\n  qni expect PAULI_STRING \[PAULI_STRING\.\.\.\]/u);
    });
  });

  it('treats dash-prefixed observables like the Ruby command without invoking fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir);

      const result = captureDispatcherRun(dir, ['expect', '--bad']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'Pauli string length must match qubit count: --BAD\n');
    });
  });

  it('prints normalized expectation values and signs as newline-terminated JSON', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 2, cols: [['H', 1], ['•', 'X']] });

      const result = captureDispatcherRun(dir, ['expect', 'zz', 'YY', 'zi', 'zz', '--json']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.ok(result.stdout.endsWith('\n'));
      assert.deepEqual(JSON.parse(result.stdout), {
        expectations: [
          { pauli: 'ZZ', value: 1, sign: 1 },
          { pauli: 'YY', value: -1, sign: -1 },
          { pauli: 'ZI', value: 0, sign: 0 },
          { pauli: 'ZZ', value: 1, sign: 1 }
        ]
      });
    });
  });

  it('uses the standard Pauli Y expectation contraction', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['H'], ['S']] });

      const result = captureDispatcherRun(dir, ['expect', 'Y', '--json']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(result.stdout), {
        expectations: [{ pauli: 'Y', value: 1, sign: 1 }]
      });
    });
  });

  it('rejects --json with --latex before loading the circuit', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['expect', 'Z', '--json', '--latex']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '--json cannot be used with --latex\n');
    });
  });

  it('rejects --json without a Pauli string before loading the circuit', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['expect', '--json']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'at least one Pauli string is required with --json\n');
    });
  });

  it('does not print partial JSON when a later Pauli string is invalid', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir);

      const result = captureDispatcherRun(dir, ['expect', 'Z', 'BAD', '--json']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'Pauli string length must match qubit count: BAD\n');
    });
  });

  it('rejects a non-real expectation without printing JSON', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir);
      const originalConjugate = Complex.prototype.conjugate;
      Complex.prototype.conjugate = function conjugateWithError(): Complex {
        const conjugated = originalConjugate.call(this);
        return new Complex(conjugated.real, conjugated.imaginary + 0.5);
      };

      try {
        const result = captureDispatcherRun(dir, ['expect', 'Z', '--json']);

        assert.equal(result.exitStatus, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'expectation value is not real: Z\n');
      } finally {
        Complex.prototype.conjugate = originalConjugate;
      }
    });
  });
});
