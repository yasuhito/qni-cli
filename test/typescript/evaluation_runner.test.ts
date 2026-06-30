import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { gradeBenchmarkSuite, gradeBenchmarkTask } from '../../src/evaluation_runner';

interface CapturedValue<T> {
  readonly stderr: string;
  readonly stdout: string;
  readonly value: T;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-evaluation-runner-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function captureProcessWrites<T>(callback: () => T): CapturedValue<T> {
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
    const value = callback();

    return {
      stderr,
      stdout,
      value
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

describe('evaluation runner public entrypoints', () => {
  it('grades a single benchmark task without writing CLI output', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'run', status: 'passed' }]
      });
    });
  });

  it('grades a benchmark suite without writing CLI output', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkSuite({
        benchmarkDir: 'benchmarks/quantum-katas',
        solutionsDir: 'benchmarks/solutions/quantum-katas'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.equal(captured.value.status, 'passed');
      assert.equal(captured.value.exitCode, 0);
      assert.deepStrictEqual(captured.value.summary, {
        total: 3,
        passed: 3,
        failed: 0,
        disallowed: 0,
        error: 0
      });
    });
  });
});
