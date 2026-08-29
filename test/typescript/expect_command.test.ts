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

  it('accepts accumulated imaginary rounding error in a real expectation', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 6,
        cols: [['Ry(1.23456789)', 'Rx(0.123456789)', 1, 'X^½', 'X^½', 'H']]
      });

      const result = captureDispatcherRun(dir, ['expect', 'YIIIII', '--json']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(result.stdout), {
        expectations: [{ pauli: 'YIIIII', value: 0, sign: 0 }]
      });
    });
  });

  it('rejects --json with --latex before loading the circuit', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['expect', 'Z', '--json', '--latex']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(
        result.stderr,
        '--latex cannot be used with --shots, --seed, --threshold, or --json\n'
      );
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

  it('lists same-axis correlations after explicit Pauli strings', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 3, cols: [[1, 1, 'X']] });

      const result = captureDispatcherRun(dir, [
        'expect', 'ZZZ', '--same-axis-correlations', '1'
      ]);

      assert.deepEqual(result, {
        exitStatus: 0,
        stderr: '',
        stdout: [
          'ZZZ=-1.0',
          'XII=0.0', 'IXI=0.0', 'IIX=0.0',
          'YII=0.0', 'IYI=0.0', 'IIY=0.0',
          'ZII=1.0', 'IZI=1.0', 'IIZ=-1.0',
          ''
        ].join('\n')
      });
    });
  });

  it('keeps repeated same-axis correlation groups in option order in JSON', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 2, cols: [] });

      const result = captureDispatcherRun(dir, [
        'expect', '--same-axis-correlations=1', '--same-axis-correlations', '2', '--json'
      ]);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(
        JSON.parse(result.stdout).expectations.map(({ pauli }: { pauli: string }) => pauli),
        ['XI', 'IX', 'YI', 'IY', 'ZI', 'IZ', 'XX', 'YY', 'ZZ']
      );
    });
  });

  it('rejects invalid same-axis body counts without producing stdout', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 2, cols: [] });
      const cases: readonly [readonly string[], string][] = [
        [['expect', '--same-axis-correlations', '0'], '--same-axis-correlations must be a positive integer\n'],
        [['expect', '--same-axis-correlations=1.5'], '--same-axis-correlations must be a positive integer\n'],
        [['expect', '--same-axis-correlations', '3'], '--same-axis-correlations must not exceed the circuit qubit count\n'],
        [['expect', '--same-axis-correlations'], '--same-axis-correlations requires a value\n']
      ];

      for (const [argv, stderr] of cases) {
        assert.deepEqual(captureDispatcherRun(dir, [...argv]), { exitStatus: 1, stdout: '', stderr });
      }
    });
  });

  it('prints finite-shot estimates with settings and reproducibility metadata', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 2, cols: [['H', 1], ['•', 'X']] });

      assert.deepEqual(captureDispatcherRun(dir, [
        'expect', 'ZZ', 'XX', '--shots=1000', '--seed=42'
      ]), {
        exitStatus: 0,
        stderr: '',
        stdout: [
          'shots=1000 seed=42 settings=2 criterion=2*stderr',
          'ZZ=1.0 estimate=1.0 stderr=0.0',
          'XX=1.0 estimate=1.0 stderr=0.0',
          ''
        ].join('\n')
      });
    });
  });

  it('returns structured finite-shot estimates without changing exact values', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 2, cols: [['H', 1], ['•', 'X']] });
      const result = captureDispatcherRun(dir, [
        'expect', 'ZZ', 'XX', '--shots', '1000', '--seed', '42', '--json'
      ]);

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(JSON.parse(result.stdout), {
        shots: 1000,
        seed: 42,
        criterion: { kind: 'stderr', multiplier: 2 },
        settings: [
          { axes: 'ZZ', paulis: ['ZZ'] },
          { axes: 'XX', paulis: ['XX'] }
        ],
        expectations: [
          {
            pauli: 'ZZ', value: 1, sign: 1,
            estimate: { value: 1, sign: 1, stderr: 0, unstable: false }
          },
          {
            pauli: 'XX', value: 1, sign: 1,
            estimate: { value: 1, sign: 1, stderr: 0, unstable: false }
          }
        ]
      });
    });
  });

  it('reports a generated seed that reproduces finite-shot output', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['H']] });
      const first = captureDispatcherRun(dir, ['expect', 'Z', '--shots', '20']);
      const seed = /^shots=20 seed=(\d+) /u.exec(first.stdout)?.[1];
      assert.notEqual(seed, undefined);

      const replay = captureDispatcherRun(dir, ['expect', 'Z', '--shots', '20', '--seed', seed as string]);
      assert.deepEqual(replay, first);
    });
  });

  it('applies an explicit threshold to exact and estimated values', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['H']] });

      assert.equal(
        captureDispatcherRun(dir, ['expect', 'Z', '--threshold', '0.5']).stdout,
        'criterion=threshold=0.5\nZ=0.0 unstable\n'
      );
      assert.match(
        captureDispatcherRun(dir, ['expect', 'Z', '--shots', '20', '--seed', '42', '--threshold', '0.5']).stdout,
        /^shots=20 seed=42 settings=1 criterion=threshold=0\.5$/mu
      );
    });
  });

  it('rejects invalid finite-shot options before producing output', async () => {
    await withTempDir(async (dir) => {
      const cases: readonly [readonly string[], string][] = [
        [['expect', 'Z', '--seed', '42'], '--seed requires --shots\n'],
        [['expect', 'Z', '--shots', '0'], '--shots must be a positive integer\n'],
        [['expect', 'Z', '--threshold', '1.1'], '--threshold must be a number between 0 and 1\n'],
        [
          ['expect', 'Z', '--latex', '--shots', '10'],
          '--latex cannot be used with --shots, --seed, --threshold, or --json\n'
        ]
      ];

      for (const [argv, stderr] of cases) {
        assert.deepEqual(captureDispatcherRun(dir, [...argv]), { exitStatus: 1, stdout: '', stderr });
      }
    });
  });

  it('keeps measurement circuits unsupported for finite-shot expectations', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['Measure']] });
      const result = captureDispatcherRun(dir, ['expect', 'Z', '--shots', '10', '--seed', '42']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'unsupported gate for run: "Measure"\n');
    });
  });
});
