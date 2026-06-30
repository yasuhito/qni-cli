import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { readBenchmarkSubmission } from '../../src/evaluation_runner/benchmark_submission';

interface AllowedCommand {
  readonly argv: readonly string[];
  readonly source: string;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-evaluation-submission-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function allowedCommand(source: string, argv: readonly string[]): AllowedCommand {
  return { argv, source };
}

describe('evaluation runner submission parsing', () => {
  it('reads one qni command per non-empty .qni line before grading', async () => {
    await withTempDir(async (dir) => {
      const submissionPath = path.join(dir, 'submission.qni');
      await writeFile(submissionPath, [
        '',
        '  qni add X --qubit 0 --step 0  ',
        '',
        'qni run',
        ''
      ].join('\n'));

      const submission = readBenchmarkSubmission({
        allowedCommands: [allowedCommand('qni add', ['add']), allowedCommand('qni run', ['run'])],
        submissionPath
      });

      assert.deepStrictEqual(submission, {
        kind: 'allowed',
        commands: [
          {
            argv: ['add', 'X', '--qubit', '0', '--step', '0'],
            lineNumber: 2,
            source: 'qni add X --qubit 0 --step 0'
          },
          {
            argv: ['run'],
            lineNumber: 4,
            source: 'qni run'
          }
        ]
      });
    });
  });

  it('returns the first command that is not allowed by the benchmark task', async () => {
    await withTempDir(async (dir) => {
      const submissionPath = path.join(dir, 'submission.qni');
      await writeFile(submissionPath, [
        'qni add X --qubit 0 --step 0',
        'qni run',
        ''
      ].join('\n'));

      const submission = readBenchmarkSubmission({
        allowedCommands: [allowedCommand('qni add', ['add'])],
        submissionPath
      });

      assert.deepStrictEqual(submission, {
        kind: 'disallowed',
        disallowedSubmission: {
          command: {
            argv: ['run'],
            lineNumber: 2,
            source: 'qni run'
          }
        }
      });
    });
  });

  it('rejects .qni lines that do not start with qni', async () => {
    await withTempDir(async (dir) => {
      const submissionPath = path.join(dir, 'submission.qni');
      await writeFile(submissionPath, 'echo not-qni\n');

      assert.throws(
        () => readBenchmarkSubmission({
          allowedCommands: [allowedCommand('qni add', ['add'])],
          submissionPath
        }),
        /submission command must start with qni at line 1: echo not-qni/u
      );
    });
  });
});
