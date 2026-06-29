import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { streamChunkText } from '../../src/commands/benchmark_command';
import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-benchmark-'));

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

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
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
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
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

describe('benchmark command TypeScript route', () => {
  it('decodes Uint8Array stream chunks as UTF-8 text', () => {
    assert.equal(streamChunkText(new Uint8Array([97, 98])), 'ab');
  });

  it('uses checks.tolerance from the task file during run checks', async () => {
    await withTempDir(async (dir) => {
      const taskLines = (tolerance: string) => [
        '---',
        'id: numeric/tolerance',
        'title: ToleranceCheck',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        `  tolerance: ${tolerance}`,
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 0.999999999999',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n');
      await writeFile(path.join(dir, 'loose.md'), taskLines('1e-11'));
      await writeFile(path.join(dir, 'tight.md'), taskLines('1e-13'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit 0 --step 0\n');

      const loose = captureDispatcherRun(dir, ['benchmark', 'run', 'loose.md', 'submission.qni']);
      const tight = captureDispatcherRun(dir, ['benchmark', 'run', 'tight.md', 'submission.qni']);

      assert.equal(loose.exitStatus, 0, loose.stderr);
      assert.equal(tight.exitStatus, 1, tight.stderr);
    });
  });

  it('passes the PlusState solution using the task tolerance for rounded amplitudes', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/superposition/plus-state.md',
        'benchmarks/solutions/quantum-katas/superposition/plus-state.qni'
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, 'PASS PlusState\nchecks: 1\n');
      assert.equal(result.stderr, '');
    });
  });

  it('parses scientific notation in imaginary amplitudes during run checks', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: numeric/small-rx',
        'title: SmallRx',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-18',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|0>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 0',
        '            imaginary: -1.5707963267948965e-15',
        '---',
        '',
        'Apply a tiny Rx rotation.'
      ].join('\n'));
      await writeFile(
        path.join(dir, 'submission.qni'),
        'qni add Rx --angle pi/1000000000000000 --qubit 0 --step 0\n'
      );

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, 'PASS SmallRx\nchecks: 1\n');
      assert.equal(result.stderr, '');
    });
  });
});
