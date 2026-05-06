import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

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

  it('falls back from missing repository runtime to uv when system python lacks SymPy', async () => {
    await withTempDir(async (projectRoot) => {
      const bin = path.join(projectRoot, 'bin');
      await writeSymbolicHelperPlaceholder(projectRoot);
      await writeExecutable(
        path.join(bin, 'python3'),
        `#!/bin/sh
echo "ModuleNotFoundError: No module named 'sympy'" >&2
exit 1
`
      );
      await writeExecutable(path.join(bin, 'uv'), '#!/bin/sh\necho uv-success\n');

      assert.equal(
        renderSymbolicStateVector({
          circuit: {
            cols: [[1]],
            qubits: 1
          },
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
        '#!/bin/sh\necho "repo runtime failed" >&2\nexit 9\n'
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
  it('runs --symbolic without invoking Ruby fallback', async () => {
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
