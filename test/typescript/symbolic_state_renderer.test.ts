import assert from 'node:assert/strict';
import * as childProcess from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, mock } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';
import {
  renderSymbolicStateVector,
  SymbolicStateRendererError
} from '../../src/symbolic_state_renderer';

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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-symbolic-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

async function writeExecutable(filePath: string, body: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  await chmod(filePath, 0o755);
}

async function writeSymbolicHelperPlaceholder(projectRoot: string): Promise<void> {
  await mkdir(path.join(projectRoot, 'libexec'), { recursive: true });
  await writeFile(path.join(projectRoot, 'libexec', 'qni_symbolic_run.py'), '');
}

function epipeProneCircuit(): { cols: number[][]; qubits: number } {
  return {
    // Keep the serialized input well above typical 64 KB stdin pipe buffers.
    cols: Array(200_000).fill([1]),
    qubits: 1
  };
}

function captureDispatcherRun(cwd: string, argv: string[], env: NodeJS.ProcessEnv = { PATH: '' }): CapturedRun {
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

describe('TypeScript symbolic state renderer boundary', () => {
  it('renders text and LaTeX through the retained Python helper', () => {
    const circuit = {
      cols: [['H']],
      qubits: 1
    };

    assert.equal(
      renderSymbolicStateVector({
        circuit,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }),
      'sqrt(2)/2|0> + sqrt(2)/2|1>'
    );
    assert.equal(
      renderSymbolicStateVector({
        circuit,
        env: { PATH: '' },
        format: 'latex',
        projectRoot: process.cwd()
      }),
      '\\frac{\\sqrt{2}}{2} \\lvert 0 \\rangle + \\frac{\\sqrt{2}}{2} \\lvert 1 \\rangle'
    );
  });

  it('passes named basis options to the helper', () => {
    assert.equal(
      renderSymbolicStateVector({
        basis: 'x',
        circuit: {
          cols: [['H']],
          qubits: 1
        },
        env: { PATH: '' },
        projectRoot: process.cwd()
      }),
      '|+>'
    );
  });

  it('validates named-basis qubit counts before invoking helpers', () => {
    assert.throws(
      () =>
        renderSymbolicStateVector({
          basis: 'x',
          circuit: {
            cols: [[1, 1]],
            qubits: 2
          },
          env: { PATH: '' },
          projectRoot: process.cwd()
        }),
      (error: unknown) =>
        error instanceof SymbolicStateRendererError &&
        error.message === 'symbolic x-basis run currently supports only 1-qubit circuits'
    );
  });

  it('continues to uv after an EPIPE from retryable system python stderr', () => {
    const calls: string[] = [];
    const missingRuntime = new Error('spawn ENOENT') as NodeJS.ErrnoException;
    const brokenPipe = new Error('write EPIPE') as NodeJS.ErrnoException;
    missingRuntime.code = 'ENOENT';
    brokenPipe.code = 'EPIPE';

    const spawnMock = mock.method(
      childProcessForMock,
      'spawnSync',
      ((command: string) => {
        calls.push(command);

        if (command.endsWith('/.python-symbolic/bin/python')) {
          return spawnResult({ error: missingRuntime, status: null });
        }

        if (command === 'python3') {
          return spawnResult({
            error: brokenPipe,
            status: 1,
            stderr: "ModuleNotFoundError: No module named 'sympy'\n"
          });
        }

        if (command === 'uv') {
          return spawnResult({ stdout: 'uv-success\n' });
        }

        return spawnResult({
          status: 127,
          stderr: `unexpected command: ${command}`
        });
      }) as unknown as typeof childProcess.spawnSync
    );

    try {
      assert.equal(
        renderSymbolicStateVector({
          circuit: {
            cols: [[1]],
            qubits: 1
          },
          env: { PATH: '' },
          projectRoot: '/project'
        }),
        'uv-success'
      );
      assert.deepEqual(calls, ['/project/.python-symbolic/bin/python', 'python3', 'uv']);
    } finally {
      spawnMock.mock.restore();
    }
  });

  it('returns stdout when an EPIPE helper result reports success', () => {
    const brokenPipe = new Error('write EPIPE') as NodeJS.ErrnoException;
    brokenPipe.code = 'EPIPE';
    const spawnMock = mock.method(
      childProcessForMock,
      'spawnSync',
      (() =>
        spawnResult({
          error: brokenPipe,
          status: 0,
          stdout: 'python-success\n'
        })) as unknown as typeof childProcess.spawnSync
    );

    try {
      assert.equal(
        renderSymbolicStateVector({
          circuit: {
            cols: [[1]],
            qubits: 1
          },
          env: { PATH: '' },
          projectRoot: '/project'
        }),
        'python-success'
      );
    } finally {
      spawnMock.mock.restore();
    }
  });

  it('falls back from missing repository runtime to uv when system python lacks SymPy', async () => {
    await withTempDir(async (projectRoot) => {
      const bin = path.join(projectRoot, 'bin');
      await writeSymbolicHelperPlaceholder(projectRoot);
      await writeExecutable(
        path.join(bin, 'python3'),
        `#!/bin/sh
while IFS= read -r _; do :; done
echo "ModuleNotFoundError: No module named 'sympy'" >&2
exit 1
`
      );
      await writeExecutable(path.join(bin, 'uv'), '#!/bin/sh\nwhile IFS= read -r _; do :; done\necho uv-success\n');

      assert.equal(
        renderSymbolicStateVector({
          circuit: epipeProneCircuit(),
          env: { PATH: bin },
          projectRoot
        }),
        'uv-success'
      );
    });
  });

  it('does not mask a non-zero repository runtime helper failure', async () => {
    await withTempDir(async (projectRoot) => {
      const bin = path.join(projectRoot, 'bin');
      await writeSymbolicHelperPlaceholder(projectRoot);
      await writeExecutable(
        path.join(projectRoot, '.python-symbolic', 'bin', 'python'),
        '#!/bin/sh\nwhile IFS= read -r _; do :; done\necho "repo runtime failed" >&2\nexit 9\n'
      );
      await writeExecutable(path.join(bin, 'python3'), '#!/bin/sh\necho should-not-run\n');

      assert.throws(
        () =>
          renderSymbolicStateVector({
            circuit: {
              cols: [[1]],
              qubits: 1
            },
            env: { PATH: bin },
            projectRoot
          }),
        (error: unknown) =>
          error instanceof SymbolicStateRendererError && error.message === 'repo runtime failed'
      );
    });
  });
});

describe('run command symbolic TypeScript route', () => {
  it('runs --symbolic through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const bin = path.join(dir, 'bin');
      await writeCircuit(dir, {
        cols: [['H']],
        qubits: 1
      });
      await writeExecutable(path.join(bin, 'bundle'), '#!/bin/sh\necho RUBY_FALLBACK_INVOKED >&2\nexit 42\n');

      const result = captureDispatcherRun(dir, ['run', '--symbolic'], { PATH: bin });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, 'sqrt(2)/2|0> + sqrt(2)/2|1>\n');
    });
  });

  it('prints run help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const bin = path.join(dir, 'bin');
      await writeExecutable(path.join(bin, 'bundle'), '#!/bin/sh\necho RUBY_FALLBACK_INVOKED >&2\nexit 42\n');

      const result = captureDispatcherRun(dir, ['run', '--help'], { PATH: bin });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^Usage:\n  qni run \[--symbolic\] \[--basis=BASIS\]/u);
    });
  });

  it('rejects unknown run options through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const bin = path.join(dir, 'bin');
      await writeExecutable(path.join(bin, 'bundle'), '#!/bin/sh\necho RUBY_FALLBACK_INVOKED >&2\nexit 42\n');

      const result = captureDispatcherRun(dir, ['run', '--bad'], { PATH: bin });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'ERROR: "qni simulate" was called with arguments ["--bad"]\nUsage: "qni run"\n');
    });
  });

  it('rejects --basis without --symbolic before helper execution', async () => {
    await withTempDir(async (dir) => {
      const bin = path.join(dir, 'bin');
      await writeCircuit(dir, {
        cols: [[1]],
        qubits: 1
      });
      await writeExecutable(path.join(bin, 'bundle'), '#!/bin/sh\necho RUBY_FALLBACK_INVOKED >&2\nexit 42\n');

      const result = captureDispatcherRun(dir, ['run', '--basis', 'x'], { PATH: bin });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '--basis requires --symbolic\n');
    });
  });

  it('passes an empty symbolic basis value to the helper like Ruby', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        cols: [[1]],
        qubits: 1
      });

      const result = captureDispatcherRun(dir, ['run', '--symbolic', '--basis=']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'unsupported symbolic basis:\n');
    });
  });
});
