import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildResearchCompare, formatResearchCompareHumanOutput } from '../../src/research_compare';
import {
  makeStoredResearchTrialDir,
  storedResearchMetadata,
  writeJsonFile,
  type StoredResearchStatus
} from './helpers/research_trial';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-compare-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

interface CompareTaskFixture {
  readonly status: StoredResearchStatus;
  readonly taskId: string;
  readonly title: string;
}

async function writeCompareTrial(
  dir: string,
  id: string,
  options: {
    readonly benchmark?: string;
    readonly collaborator?: string;
    readonly resultOverride?: Record<string, unknown>;
    readonly status?: StoredResearchStatus;
    readonly submissionProtocol?: string;
    readonly taskSelection?: readonly string[];
    readonly taskSelectionMode?: 'full' | 'selected';
    readonly tasks?: readonly CompareTaskFixture[];
  } = {}
): Promise<void> {
  const trialDir = await makeStoredResearchTrialDir(dir, id);
  const tasks = options.tasks ?? [
    { taskId: 'task-1', title: 'Task 1', status: options.status ?? 'passed' }
  ];
  const status = options.status ?? suiteStatus(tasks);

  await writeJsonFile(path.join(trialDir, 'metadata.json'), {
    ...storedResearchMetadata(id, {
      benchmark: options.benchmark,
      collaborator: options.collaborator,
      status
    }),
    ...(options.submissionProtocol === undefined ? {} : { submissionProtocol: options.submissionProtocol }),
    ...(options.taskSelection === undefined ? {} : { taskSelection: options.taskSelection }),
    ...(options.taskSelectionMode === undefined ? {} : { taskSelectionMode: options.taskSelectionMode })
  });
  await writeJsonFile(path.join(trialDir, 'result.json'), options.resultOverride ?? {
    status,
    exitCode: statusExitCode(status),
    summary: summaryForTasks(tasks),
    results: tasks.map((task, index) => ({
      task: `${task.taskId}.md`,
      taskId: task.taskId,
      title: task.title,
      submission: `submissions/${task.taskId}.qni`,
      status: task.status,
      exitCode: statusExitCode(task.status),
      checks: [{ type: 'run', status: task.status === 'passed' ? 'passed' : 'failed' }],
      order: index
    }))
  });
}

function suiteStatus(tasks: readonly CompareTaskFixture[]): StoredResearchStatus {
  if (tasks.some((task) => task.status === 'error')) {
    return 'error';
  }
  if (tasks.some((task) => task.status === 'disallowed')) {
    return 'disallowed';
  }
  if (tasks.some((task) => task.status === 'failed')) {
    return 'failed';
  }
  return 'passed';
}

function summaryForTasks(tasks: readonly CompareTaskFixture[]): Record<string, number> {
  return {
    total: tasks.length,
    passed: tasks.filter((task) => task.status === 'passed').length,
    failed: tasks.filter((task) => task.status === 'failed').length,
    disallowed: tasks.filter((task) => task.status === 'disallowed').length,
    error: tasks.filter((task) => task.status === 'error').length
  };
}

function statusExitCode(status: StoredResearchStatus): number {
  switch (status) {
    case 'passed':
      return 0;
    case 'failed':
      return 1;
    case 'disallowed':
      return 2;
    case 'error':
      return 3;
  }
}

describe('research compare builder', () => {
  it('builds a task-by-trial comparison for one benchmark', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-perfect', {
        collaborator: 'perfect-agent',
        tasks: [
          { taskId: 'task-1', title: 'Task 1', status: 'passed' },
          { taskId: 'task-2', title: 'Task 2', status: 'passed' }
        ]
      });
      await writeCompareTrial(dir, '2026-07-02T000002Z-miss-one', {
        collaborator: 'miss-one-agent',
        tasks: [
          { taskId: 'task-1', title: 'Task 1', status: 'passed' },
          { taskId: 'task-2', title: 'Task 2', status: 'failed' }
        ]
      });

      const compare = buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir });

      assert.deepStrictEqual(compare.exclusions, {
        benchmarkMismatch: 0,
        invalidTrial: 0,
        missingOrInvalidResultDetails: 0
      });
      assert.deepStrictEqual(compare.trials.map((trial) => ({ id: trial.id, score: trial.score })), [
        {
          id: '2026-07-02T000002Z-miss-one',
          score: { passed: 1, percent: 50, total: 2 }
        },
        {
          id: '2026-07-02T000001Z-perfect',
          score: { passed: 2, percent: 100, total: 2 }
        }
      ]);
      assert.deepStrictEqual(compare.tasks.map((task) => ({
        differs: task.differs,
        results: task.results.map((result) => result.status),
        taskId: task.taskId
      })), [
        {
          taskId: 'task-1',
          differs: false,
          results: ['passed', 'passed']
        },
        {
          taskId: 'task-2',
          differs: true,
          results: ['failed', 'passed']
        }
      ]);
      assert.deepStrictEqual(compare.differingTasks.map((task) => task.taskId), ['task-2']);
    });
  });

  it('counts exclusions and warns when submission protocols are mixed', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-legacy', {
        submissionProtocol: 'qni-command-output-v0'
      });
      await writeCompareTrial(dir, '2026-07-02T000002Z-neutral', {
        submissionProtocol: 'blind-neutral-circuit-json-v1'
      });
      await writeCompareTrial(dir, '2026-07-02T000003Z-other-suite', {
        benchmark: 'benchmarks/other-suite'
      });
      await writeCompareTrial(dir, '2026-07-02T000004Z-bad-result-details', {
        resultOverride: {
          status: 'passed',
          exitCode: 0,
          summary: { total: 1, passed: 1, failed: 0, disallowed: 0, error: 0 }
        }
      });
      await makeStoredResearchTrialDir(dir, 'broken-trial');

      const compare = buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir });

      assert.deepStrictEqual(compare.exclusions, {
        benchmarkMismatch: 1,
        invalidTrial: 1,
        missingOrInvalidResultDetails: 1
      });
      assert.deepStrictEqual(compare.warnings, [
        {
          submissionProtocols: ['blind-neutral-circuit-json-v1', 'qni-command-output-v0'],
          type: 'mixed-submission-protocols'
        }
      ]);
      assert.deepStrictEqual(compare.trials.map((trial) => trial.id), [
        '2026-07-02T000002Z-neutral',
        '2026-07-02T000001Z-legacy'
      ]);
    });
  });

  it('excludes result details when summary buckets disagree with task results', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-inconsistent-summary', {
        resultOverride: {
          status: 'passed',
          exitCode: 0,
          summary: { total: 2, passed: 2, failed: 0, disallowed: 0, error: 0 },
          results: [
            {
              task: 'task-1.md',
              taskId: 'task-1',
              title: 'Task 1',
              submission: 'submissions/task-1.qni',
              status: 'passed',
              exitCode: 0,
              checks: [{ type: 'run', status: 'passed' }]
            },
            {
              task: 'task-2.md',
              taskId: 'task-2',
              title: 'Task 2',
              submission: 'submissions/task-2.qni',
              status: 'failed',
              exitCode: 1,
              checks: [{ type: 'run', status: 'failed' }]
            }
          ]
        }
      });

      const compare = buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir });

      assert.deepStrictEqual(compare.exclusions, {
        benchmarkMismatch: 0,
        invalidTrial: 0,
        missingOrInvalidResultDetails: 1
      });
      assert.deepStrictEqual(compare.trials, []);
      assert.deepStrictEqual(compare.tasks, []);
    });
  });

  it('includes only trials with the requested task selection', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-full');
      await writeCompareTrial(dir, '2026-07-02T000002Z-subset', { taskSelection: ['task-1'] });

      const compare = buildResearchCompare({
        benchmark: 'benchmarks/quantum-katas',
        cwd: dir,
        taskSelection: ['task-1']
      });

      assert.deepStrictEqual(compare.trials.map((trial) => trial.id), ['2026-07-02T000002Z-subset']);
      assert.equal(compare.exclusions.benchmarkMismatch, 1);
    });
  });

  it('excludes trials whose recorded task selection differs from result task ids', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-inconsistent-selection', {
        taskSelection: ['task-1'],
        tasks: [{ taskId: 'task-2', title: 'Task 2', status: 'passed' }]
      });

      const compare = buildResearchCompare({
        benchmark: 'benchmarks/quantum-katas',
        cwd: dir,
        taskSelection: ['task-1']
      });

      assert.deepStrictEqual(compare.exclusions, {
        benchmarkMismatch: 0,
        invalidTrial: 1,
        missingOrInvalidResultDetails: 0
      });
      assert.deepStrictEqual(compare.trials, []);
    });
  });

  it('includes a new full-suite trial when task selection is omitted', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-full', {
        taskSelection: ['task-1'],
        taskSelectionMode: 'full'
      });

      const compare = buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir });

      assert.deepStrictEqual(compare.trials.map((trial) => trial.id), ['2026-07-02T000001Z-full']);
    });
  });

  it('compares only full-suite trials with the same result task ids', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-old-task-set', {
        tasks: [{ taskId: 'task-1', title: 'Task 1', status: 'passed' }]
      });
      await writeCompareTrial(dir, '2026-07-02T000002Z-new-task-set', {
        tasks: [{ taskId: 'task-2', title: 'Task 2', status: 'passed' }]
      });

      const compare = buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir });

      assert.deepStrictEqual(compare.trials.map((trial) => trial.id), [
        '2026-07-02T000002Z-new-task-set'
      ]);
      assert.equal(compare.exclusions.benchmarkMismatch, 1);
    });
  });

  it('formats human output with the task matrix and differing tasks', async () => {
    await withTempDir(async (dir) => {
      await writeCompareTrial(dir, '2026-07-02T000001Z-perfect', {
        tasks: [
          { taskId: 'task-1', title: 'Task 1', status: 'passed' },
          { taskId: 'task-2', title: 'Task 2', status: 'passed' }
        ]
      });
      await writeCompareTrial(dir, '2026-07-02T000002Z-miss-one', {
        tasks: [
          { taskId: 'task-1', title: 'Task 1', status: 'passed' },
          { taskId: 'task-2', title: 'Task 2', status: 'failed' }
        ]
      });

      const output = formatResearchCompareHumanOutput(
        buildResearchCompare({ benchmark: 'benchmarks/quantum-katas', cwd: dir })
      );

      assert.match(output, /Research trial comparison/u);
      assert.match(output, /Task matrix/u);
      assert.match(output, /task-2\s+Task 2\s+failed\s+passed/u);
      assert.match(output, /Differing tasks/u);
      assert.match(output, /task-2 Task 2: passed 1, failed 1/u);
    });
  });
});
