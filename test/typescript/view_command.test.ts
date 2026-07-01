import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';
import { parseAsciiCircuit } from '../../src/view/ascii_circuit_parser';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-view-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
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
    callback?: (error?: Error | null) => void
  ): boolean => {
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

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

function withStreamTty<T>(options: { stderr: boolean; stdout: boolean }, callback: () => T): T {
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');

  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: options.stdout
  });
  Object.defineProperty(process.stderr, 'isTTY', {
    configurable: true,
    value: options.stderr
  });

  try {
    return callback();
  } finally {
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    } else {
      Reflect.deleteProperty(process.stdout, 'isTTY');
    }

    if (stderrDescriptor) {
      Object.defineProperty(process.stderr, 'isTTY', stderrDescriptor);
    } else {
      Reflect.deleteProperty(process.stderr, 'isTTY');
    }
  }
}

describe('view command TypeScript route', () => {
  it('renders a single-qubit gate through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['view']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(
        result.stdout,
        [
          '    ┌───┐',
          'q0: ┤ H ├',
          '    └───┘',
          ''
        ].join('\n')
      );
    });
  });

  it('renders controlled and angled gates with stable ASCII art', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [['•', 'Rz(π/2)']]
      });

      const result = captureDispatcherRun(dir, ['view']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(
        result.stdout,
        [
          'q0: ──■──',
          '      π/2',
          '    ┌─┴─┐',
          'q1: ┤ Rz├',
          '    └───┘',
          ''
        ].join('\n')
      );
    });
  });

  it('renders controlled SWAP with stable ASCII art', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [['•', 'Swap', 'Swap']]
      });

      const result = captureDispatcherRun(dir, ['view']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(
        result.stdout,
        [
          'q0: ─■─',
          '     │',
          'q1: ─X─',
          '     │',
          'q2: ─X─',
          ''
        ].join('\n')
      );
    });
  });

  it('uses dim suffix color for compact TTY labels', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['T†'], ['Ry(π/2)']]
      });

      const result = withStreamTty({ stderr: false, stdout: true }, () => captureDispatcherRun(dir, ['view']));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /T\u001B\[37;2m†\u001B\[0m/u);
      assert.match(result.stdout, /R\u001B\[37;2my\u001B\[0m/u);
    });
  });

  it('reports a missing circuit through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['view']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'circuit.json does not exist\n');
    });
  });

  it('prints view help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['view', '--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(
        result.stdout,
        `Usage:
  qni view

Overview:
  Render ./circuit.json as an ASCII circuit diagram.
  Output uses plain box-drawing text in non-TTY contexts.

Examples:
  qni view
`
      );
    });
  });

  it('rejects unknown options through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['view', '--bad'], { PATH: '' });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'ERROR: "qni view" was called with arguments ["--bad"]\nUsage: "qni view"\n');
    });
  });
});

describe('ASCII circuit parser TypeScript port', () => {
  it('parses a controlled gate from qni view ASCII', () => {
    assert.deepEqual(
      parseAsciiCircuit(
        [
          'q0: ──■──',
          '    ┌─┴─┐',
          'q1: ┤ X ├',
          '    └───┘'
        ].join('\n')
      ),
      {
        qubits: 2,
        cols: [['•', 'X']]
      }
    );
  });

  it('parses right-justified qubit labels from larger circuits', () => {
    assert.deepEqual(
      parseAsciiCircuit(
        [
          '     q0: ─────',
          '     q1: ─────',
          '     q2: ─────',
          '     q3: ─────',
          '     q4: ─────',
          '     q5: ─────',
          '     q6: ─────',
          '     q7: ─────',
          '     q8: ─────',
          '     q9: ─────',
          '    q10: ─────',
          '    q11: ─────'
        ].join('\n')
      ),
      {
        qubits: 12,
        cols: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]
      }
    );
  });

  it('parses angled gate annotations', () => {
    assert.deepEqual(
      parseAsciiCircuit(
        [
          '     π/2',
          '    ┌───┐',
          'q0: ┤ Ry├',
          '    └───┘'
        ].join('\n')
      ),
      {
        qubits: 1,
        cols: [['Ry(π/2)']]
      }
    );

    assert.deepEqual(
      parseAsciiCircuit(
        [
          '     2θ',
          '    ┌───┐',
          'q0: ┤ Ry├',
          '    └───┘'
        ].join('\n')
      ),
      {
        qubits: 1,
        cols: [['Ry(2*theta)']]
      }
    );
  });
});
