import assert from 'node:assert/strict';
import * as childProcess from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, mock } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';
import { typesetMath } from '../../src/qni-math/typesetter';
import { Simulator } from '../../src/simulator';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

const childProcessForMock = createRequire(__filename)('node:child_process') as typeof childProcess;

function spawnResult(
  overrides: Partial<childProcess.SpawnSyncReturns<string>>
): childProcess.SpawnSyncReturns<string> {
  return {
    output: [],
    pid: 0,
    signal: null,
    status: 0,
    stderr: '',
    stdout: '',
    ...overrides
  };
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-run-latex-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

function captureDispatcherRun(
  cwd: string,
  argv: string[],
  env: NodeJS.ProcessEnv = { PATH: '' },
  projectRoot = process.cwd()
): CapturedRun {
  let stdout = '';
  let stderr = '';
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += chunk.toString();
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      exitStatus: createDispatcher({ cwd, env, projectRoot }).run(argv),
      stderr,
      stdout
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

describe('run command exact LaTeX route', () => {
  it('renders Bell-state amplitudes exactly and MathJax can typeset them', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [
          ['H', 1],
          ['•', 'X']
        ],
        qubits: 2
      });

      const result = captureDispatcherRun(dir, ['run', '--latex']);

      assert.deepEqual(result, {
        exitStatus: 0,
        stderr: '',
        stdout: '\\frac{\\sqrt{2}}{2}\\ket{00} + \\frac{\\sqrt{2}}{2}\\ket{11}\n'
      });
      assert.ok(
        typesetMath(result.stdout.trim(), '#100f0f', 80, { heightPx: 20, widthPx: 10 }).png.length > 0
      );
    });
  });

  it('does not render the numeric state vector when exact LaTeX succeeds', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['H']],
        qubits: 1
      });
      const numericRenderMock = mock.method(Simulator.prototype, 'renderStateVectorLatex', () => {
        throw new Error('numeric state vector must not render');
      });

      try {
        assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
          exitStatus: 0,
          stderr: '',
          stdout: '\\frac{\\sqrt{2}}{2}\\ket{0} + \\frac{\\sqrt{2}}{2}\\ket{1}\n'
        });
        assert.equal(numericRenderMock.mock.callCount(), 0);
      } finally {
        numericRenderMock.mock.restore();
      }
    });
  });

  it('tries the exact renderer above the numeric simulator qubit limit', async () => {
    await withTempDir(async (dir) => {
      const basis = '0'.repeat(31);
      await writeCircuit(dir, {
        cols: [Array(31).fill(1)],
        qubits: 31
      });
      const spawnMock = mock.method(
        childProcessForMock,
        'spawnSync',
        (() => spawnResult({ stdout: `\\lvert ${basis} \\rangle\n` })) as unknown as typeof childProcess.spawnSync
      );

      try {
        assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
          exitStatus: 0,
          stderr: '',
          stdout: `\\ket{${basis}}\n`
        });
        assert.equal(spawnMock.mock.callCount(), 1);
      } finally {
        spawnMock.mock.restore();
      }
    });
  });

  it('renders an exact complex amplitude as one fraction', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['H'], ['T']],
        qubits: 1
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
        exitStatus: 0,
        stderr: '',
        stdout: '\\frac{\\sqrt{2}}{2}\\ket{0} + \\frac{1 + i}{2}\\ket{1}\n'
      });
    });
  });

  it('groups an additive complex amplitude as the ket coefficient', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['X'], ['P(1)']],
        qubits: 1
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
        exitStatus: 0,
        stderr: '',
        stdout: '\\left(\\cos{\\left(1 \\right)} + i \\sin{\\left(1 \\right)}\\right)\\ket{1}\n'
      });
    });
  });

  it('renders a large supported circuit exactly without dense gate matrices', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['H', ...Array(14).fill(1)]],
        qubits: 15
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
        exitStatus: 0,
        stderr: '',
        stdout: [
          '\\frac{\\sqrt{2}}{2}\\ket{000000000000000}',
          ' + ',
          '\\frac{\\sqrt{2}}{2}\\ket{100000000000000}\n'
        ].join('')
      });
    });
  });

  it('falls back to rounded numeric LaTeX when no symbolic runtime is available', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['H']],
        qubits: 1
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex'], { PATH: '' }, dir), {
        exitStatus: 0,
        stderr: '',
        stdout: '0.707106781186547\\ket{0} + 0.707106781186547\\ket{1}\n'
      });
    });
  });

  it('falls back to rounded numeric LaTeX for a symbolically unsupported gate', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['X^½']],
        qubits: 1
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
        exitStatus: 0,
        stderr: '',
        stdout: '(0.5+0.5i)\\ket{0} + (0.5-0.5i)\\ket{1}\n'
      });
    });
  });

  it('does not hide an unexpected symbolic helper failure', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [['H']],
        qubits: 1
      });
      const spawnMock = mock.method(
        childProcessForMock,
        'spawnSync',
        (() => spawnResult({ status: 9, stderr: 'symbolic helper exploded\n' })) as unknown as typeof childProcess.spawnSync
      );

      try {
        assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
          exitStatus: 1,
          stderr: 'symbolic helper exploded\n',
          stdout: ''
        });
      } finally {
        spawnMock.mock.restore();
      }
    });
  });

  it('validates numeric inputs before rendering exact LaTeX', async () => {
    await withTempDir(async (dir) => {
      const invalidCircuits = [
        {
          circuit: { cols: [['Ry(theta)']], qubits: 1 },
          error: 'unresolved angle variable: theta\n'
        },
        {
          circuit: {
            cols: [],
            initial_state: {
              format: 'ket_sum_v1',
              terms: [
                { basis: '0', coefficient: 'alpha' },
                { basis: '1', coefficient: 'beta' }
              ]
            },
            qubits: 1
          },
          error: 'unresolved initial state variable: alpha\n'
        },
        {
          circuit: {
            cols: [],
            initial_state: {
              format: 'ket_sum_v1',
              terms: [
                { basis: '0', coefficient: 'alpha' },
                { basis: '1', coefficient: 'beta' }
              ]
            },
            qubits: 1,
            variables: { alpha: '1', beta: '1' }
          },
          error: 'initial state must be normalized\n'
        }
      ];

      for (const { circuit, error } of invalidCircuits) {
        await writeCircuit(dir, circuit);
        assert.deepEqual(captureDispatcherRun(dir, ['run', '--latex']), {
          exitStatus: 1,
          stderr: error,
          stdout: ''
        });
      }
    });
  });
});
