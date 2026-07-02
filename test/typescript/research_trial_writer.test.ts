import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { BenchmarkSuiteGradingResult } from '../../src/evaluation_runner';
import {
  planResearchTrialDirectory,
  writeResearchTrialDirectory
} from '../../src/research_trial_writer';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-writer-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function withFixedDateNow<T>(isoTimestamp: string, callback: () => Promise<T>): Promise<T> {
  const originalDateNow = Date.now;
  const fixedTimeMs = new Date(isoTimestamp).getTime();

  Date.now = (() => fixedTimeMs) as typeof Date.now;
  try {
    return await callback();
  } finally {
    Date.now = originalDateNow;
  }
}

function gradingResult(): BenchmarkSuiteGradingResult {
  return {
    status: 'passed',
    exitCode: 0,
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      disallowed: 0,
      error: 0
    },
    results: [
      {
        task: 'tasks/state-flip.md',
        taskId: 'tasks/state-flip',
        title: 'StateFlip',
        submission: 'submissions/state-flip.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'run', status: 'passed' }]
      }
    ]
  };
}

describe('research trial writer', () => {
  it('writes the shared research trial directory format without the record command', async () => {
    await withFixedDateNow('2026-07-02T03:04:05.987Z', async () => {
      await withTempDir(async (dir) => {
        const submissionsDir = path.join(dir, 'generated-submissions');

        await mkdir(submissionsDir, { recursive: true });
        await writeFile(path.join(dir, 'generated-prompt.md'), 'Solve the suite.\n');
        await writeFile(path.join(dir, 'generated-response.md'), 'qni add X --qubit 0 --step 0\n');
        await writeFile(path.join(submissionsDir, 'state-flip.qni'), 'qni add X --qubit 0 --step 0\n');

        const plan = planResearchTrialDirectory({ cwd: dir, slug: 'solve-smoke' });

        writeResearchTrialDirectory({
          benchmark: 'benchmarks/smoke',
          collaborator: 'gpt-4-1-mini',
          inputPaths: {
            prompt: path.join(dir, 'generated-prompt.md'),
            response: path.join(dir, 'generated-response.md'),
            submissions: submissionsDir
          },
          plan,
          result: gradingResult()
        });

        assert.equal(plan.id, '2026-07-02T030405Z-solve-smoke');
        assert.equal(plan.relativePath, 'research/runs/2026-07-02T030405Z-solve-smoke');
        assert.equal(await readFile(path.join(plan.trialDir, 'prompt.md'), 'utf8'), 'Solve the suite.\n');
        assert.equal(await readFile(path.join(plan.trialDir, 'response.md'), 'utf8'), 'qni add X --qubit 0 --step 0\n');
        assert.equal((await stat(path.join(plan.trialDir, 'submissions', 'state-flip.qni'))).isFile(), true);
        assert.deepStrictEqual(JSON.parse(await readFile(path.join(plan.trialDir, 'metadata.json'), 'utf8')) as unknown, {
          schemaVersion: 1,
          id: '2026-07-02T030405Z-solve-smoke',
          createdAt: '2026-07-02T03:04:05.000Z',
          collaborator: 'gpt-4-1-mini',
          benchmark: 'benchmarks/smoke',
          submissions: 'submissions',
          prompt: 'prompt.md',
          response: 'response.md',
          result: 'result.json',
          status: 'passed',
          score: {
            passed: 1,
            total: 1,
            percent: 100,
            source: 'result.json'
          }
        });
        assert.equal(await readFile(path.join(plan.trialDir, 'trial.md'), 'utf8'), [
          '# Research trial: solve-smoke',
          '',
          '- collaborator: gpt-4-1-mini',
          '- benchmark: benchmarks/smoke',
          '- status: passed',
          '- tasks: 1',
          '- passed: 1',
          '- failed: 0',
          '- disallowed: 0',
          '- error: 0',
          '- score: 100.00%',
          '',
          '## Files',
          '',
          '- Prompt: ./prompt.md',
          '- Response: ./response.md',
          '- Submissions: ./submissions/',
          '- Result: ./result.json',
          ''
        ].join('\n'));
      });
    });
  });

  it('rejects a slug that does not match the required pattern', () => {
    assert.throws(
      () => planResearchTrialDirectory({ cwd: '/tmp/unused', slug: 'Invalid_Slug' }),
      /Invalid --slug: Invalid_Slug/u
    );
    assert.throws(
      () => planResearchTrialDirectory({ cwd: '/tmp/unused', slug: 'invalid--slug' }),
      /Invalid --slug: invalid--slug/u
    );
  });

  it('refuses a destination that appears after planning before writing files', async () => {
    await withFixedDateNow('2026-07-02T03:04:05.000Z', async () => {
      await withTempDir(async (dir) => {
        const submissionsDir = path.join(dir, 'generated-submissions');

        await mkdir(submissionsDir, { recursive: true });
        await writeFile(path.join(dir, 'generated-prompt.md'), 'Solve the suite.\n');
        await writeFile(path.join(dir, 'generated-response.md'), 'qni add X --qubit 0 --step 0\n');
        await writeFile(path.join(submissionsDir, 'state-flip.qni'), 'qni add X --qubit 0 --step 0\n');

        const plan = planResearchTrialDirectory({ cwd: dir, slug: 'solve-smoke' });

        await mkdir(plan.trialDir, { recursive: true });
        assert.throws(
          () => writeResearchTrialDirectory({
            benchmark: 'benchmarks/smoke',
            collaborator: 'gpt-4-1-mini',
            inputPaths: {
              prompt: path.join(dir, 'generated-prompt.md'),
              response: path.join(dir, 'generated-response.md'),
              submissions: submissionsDir
            },
            plan,
            result: gradingResult()
          }),
          /Research trial directory already exists: research\/runs\/2026-07-02T030405Z-solve-smoke/u
        );
        await assert.rejects(
          async () => readFile(path.join(plan.trialDir, 'prompt.md'), 'utf8'),
          /ENOENT/u
        );
      });
    });
  });

  it('removes the staging directory when writing fails', async () => {
    await withFixedDateNow('2026-07-02T03:04:05.000Z', async () => {
      await withTempDir(async (dir) => {
        const submissionsDir = path.join(dir, 'generated-submissions');

        await mkdir(submissionsDir, { recursive: true });
        await writeFile(path.join(dir, 'generated-prompt.md'), 'Solve the suite.\n');
        await writeFile(path.join(submissionsDir, 'state-flip.qni'), 'qni add X --qubit 0 --step 0\n');

        const plan = planResearchTrialDirectory({ cwd: dir, slug: 'solve-smoke' });

        assert.throws(
          () => writeResearchTrialDirectory({
            benchmark: 'benchmarks/smoke',
            collaborator: 'gpt-4-1-mini',
            inputPaths: {
              prompt: path.join(dir, 'generated-prompt.md'),
              response: path.join(dir, 'missing-response.md'),
              submissions: submissionsDir
            },
            plan,
            result: gradingResult()
          }),
          /ENOENT/u
        );
        assert.deepStrictEqual(await readdir(path.join(dir, 'research', 'runs')), []);
        await assert.rejects(
          async () => stat(plan.trialDir),
          /ENOENT/u
        );
      });
    });
  });

  it('refuses an existing research trial destination before writing files', async () => {
    await withFixedDateNow('2026-07-02T03:04:05.000Z', async () => {
      await withTempDir(async (dir) => {
        const existingTrialDir = path.join(dir, 'research', 'runs', '2026-07-02T030405Z-solve-smoke');

        await mkdir(existingTrialDir, { recursive: true });
        await assert.rejects(
          async () => planResearchTrialDirectory({ cwd: dir, slug: 'solve-smoke' }),
          /Research trial directory already exists: research\/runs\/2026-07-02T030405Z-solve-smoke/u
        );
      });
    });
  });
});
