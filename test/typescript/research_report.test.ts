import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildResearchReport, readResearchTrials, type ResearchTrial } from '../../src/research_report';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-report-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function writeResearchTrial(
  dir: string,
  id: string,
  options: {
    readonly benchmark?: string;
    readonly collaborator?: string;
    readonly status?: 'disallowed' | 'error' | 'failed' | 'passed';
  } = {}
): Promise<void> {
  const status = options.status ?? 'passed';
  const trialDir = path.join(dir, 'research', 'runs', id);

  await mkdir(trialDir, { recursive: true });
  await writeJsonFile(path.join(trialDir, 'metadata.json'), researchMetadata(id, {
    benchmark: options.benchmark,
    collaborator: options.collaborator,
    status
  }));
  await writeJsonFile(path.join(trialDir, 'result.json'), researchResult(status));
}

function createdAtForTrialId(id: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})Z/u.exec(id);

  if (!match) {
    return '2026-06-30T12:34:56.000Z';
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`;
}

async function makeResearchTrialDir(dir: string, id: string): Promise<string> {
  const trialDir = path.join(dir, 'research', 'runs', id);

  await mkdir(trialDir, { recursive: true });

  return trialDir;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function researchMetadata(
  id: string,
  options: {
    readonly benchmark?: string;
    readonly collaborator?: string;
    readonly schemaVersion?: number;
    readonly status?: 'disallowed' | 'error' | 'failed' | 'passed';
  } = {}
): Record<string, unknown> {
  return {
    schemaVersion: options.schemaVersion ?? 1,
    id,
    createdAt: createdAtForTrialId(id),
    collaborator: options.collaborator ?? 'claude-sonnet-4',
    benchmark: options.benchmark ?? 'benchmarks/quantum-katas',
    submissions: 'submissions',
    prompt: 'prompt.md',
    response: 'response.md',
    result: 'result.json',
    status: options.status ?? 'passed'
  };
}

function researchResult(
  status: 'disallowed' | 'error' | 'failed' | 'passed' = 'passed',
  options: {
    readonly summaryTotal?: number;
  } = {}
): Record<string, unknown> {
  return {
    status,
    exitCode: status === 'passed' ? 0 : 1,
    summary: {
      total: options.summaryTotal ?? 1,
      passed: status === 'passed' ? 1 : 0,
      failed: status === 'failed' ? 1 : 0,
      disallowed: status === 'disallowed' ? 1 : 0,
      error: status === 'error' ? 1 : 0
    },
    results: [
      {
        task: 'basic-gates/state-flip.md',
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'submissions/basic-gates/state-flip.qni',
        status,
        exitCode: status === 'passed' ? 0 : 1,
        checks: [{ type: 'run', status: status === 'passed' ? 'passed' : 'failed' }]
      }
    ]
  };
}

function invalidReasonsById(trials: readonly ResearchTrial[]): Map<string, string[]> {
  return new Map(trials.map((trial) => [
    trial.id,
    trial.kind === 'invalid' ? trial.invalidReason : []
  ]));
}

describe('research report reader', () => {
  it('returns an empty list when research runs do not exist', async () => {
    await withTempDir(async (dir) => {
      assert.deepStrictEqual(readResearchTrials({ cwd: dir }), []);
    });
  });

  it('returns an empty list when research runs cannot be read', async () => {
    await withTempDir(async (dir) => {
      const runsDir = path.join(dir, 'research', 'runs');

      await mkdir(runsDir, { recursive: true });
      await chmod(runsDir, 0o000);

      try {
        assert.deepStrictEqual(readResearchTrials({ cwd: dir }), []);
      } finally {
        await chmod(runsDir, 0o700);
      }
    });
  });

  it('ignores files directly under research/runs', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-smoke-claude';

      await mkdir(path.join(dir, 'research', 'runs'), { recursive: true });
      await writeFile(path.join(dir, 'research', 'runs', 'README.txt'), 'note\n');
      await writeResearchTrial(dir, id);

      assert.deepStrictEqual(readResearchTrials({ cwd: dir }).map((trial) => trial.id), [id]);
    });
  });

  it('sorts research trial candidates by timestamp descending', async () => {
    await withTempDir(async (dir) => {
      await writeResearchTrial(dir, '2026-06-30T123456Z-older');
      await writeResearchTrial(dir, '2026-07-01T000001Z-newer');

      assert.deepStrictEqual(readResearchTrials({ cwd: dir }).map((trial) => trial.id), [
        '2026-07-01T000001Z-newer',
        '2026-06-30T123456Z-older'
      ]);
    });
  });

  it('reads valid research trials with report fields', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-smoke-claude';

      await writeResearchTrial(dir, id);

      const trials = readResearchTrials({ cwd: dir });
      const trial = trials[0] as ResearchTrial | undefined;

      assert.equal(trials.length, 1);
      assert.equal(trial?.kind, 'valid');
      if (trial?.kind !== 'valid') {
        assert.fail('expected a valid research trial');
      }
      assert.deepStrictEqual(trial, {
        kind: 'valid',
        id,
        createdAt: '2026-06-30T12:34:56.000Z',
        collaborator: 'claude-sonnet-4',
        benchmark: 'benchmarks/quantum-katas',
        status: 'passed',
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          disallowed: 0,
          error: 0
        },
        path: `research/runs/${id}`
      });
    });
  });

  it('keeps research trial candidates with invalid ids', async () => {
    await withTempDir(async (dir) => {
      await writeResearchTrial(dir, 'broken-trial');

      const trials = readResearchTrials({ cwd: dir });
      const trial = trials[0] as ResearchTrial | undefined;

      assert.equal(trials.length, 1);
      assert.equal(trial?.kind, 'invalid');
      if (trial?.kind !== 'invalid') {
        assert.fail('expected an invalid research trial');
      }
      assert.equal(trial.status, 'invalid');
      assert.deepStrictEqual(trial.invalidReason, ['invalid research trial id: broken-trial']);
    });
  });

  it('marks missing research trial JSON files invalid', async () => {
    await withTempDir(async (dir) => {
      const missingMetadataId = '2026-06-30T123456Z-missing-metadata';
      const missingResultId = '2026-06-30T123457Z-missing-result';
      const missingMetadataDir = await makeResearchTrialDir(dir, missingMetadataId);
      const missingResultDir = await makeResearchTrialDir(dir, missingResultId);

      await writeJsonFile(path.join(missingMetadataDir, 'result.json'), researchResult());
      await writeJsonFile(path.join(missingResultDir, 'metadata.json'), researchMetadata(missingResultId));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })), new Map([
        [missingResultId, ['result.json is missing']],
        [missingMetadataId, ['metadata.json is missing']]
      ]));
    });
  });

  it('marks malformed research trial JSON files invalid', async () => {
    await withTempDir(async (dir) => {
      const malformedMetadataId = '2026-06-30T123456Z-malformed-metadata';
      const malformedResultId = '2026-06-30T123457Z-malformed-result';
      const malformedMetadataDir = await makeResearchTrialDir(dir, malformedMetadataId);
      const malformedResultDir = await makeResearchTrialDir(dir, malformedResultId);

      await writeFile(path.join(malformedMetadataDir, 'metadata.json'), '{\n');
      await writeJsonFile(path.join(malformedMetadataDir, 'result.json'), researchResult());
      await writeJsonFile(path.join(malformedResultDir, 'metadata.json'), researchMetadata(malformedResultId));
      await writeFile(path.join(malformedResultDir, 'result.json'), '{\n');

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })), new Map([
        [malformedResultId, ['result.json is not valid JSON']],
        [malformedMetadataId, ['metadata.json is not valid JSON']]
      ]));
    });
  });

  it('marks unreadable research trial JSON files invalid', async () => {
    await withTempDir(async (dir) => {
      const unreadableMetadataId = '2026-06-30T123456Z-unreadable-metadata';
      const unreadableResultId = '2026-06-30T123457Z-unreadable-result';
      const unreadableMetadataDir = await makeResearchTrialDir(dir, unreadableMetadataId);
      const unreadableResultDir = await makeResearchTrialDir(dir, unreadableResultId);

      await mkdir(path.join(unreadableMetadataDir, 'metadata.json'));
      await writeJsonFile(path.join(unreadableMetadataDir, 'result.json'), researchResult());
      await writeJsonFile(path.join(unreadableResultDir, 'metadata.json'), researchMetadata(unreadableResultId));
      await mkdir(path.join(unreadableResultDir, 'result.json'));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })), new Map([
        [unreadableResultId, ['result.json could not be read']],
        [unreadableMetadataId, ['metadata.json could not be read']]
      ]));
    });
  });

  it('marks unknown metadata schemas invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-schema-v2';
      const trialDir = await makeResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), researchMetadata(id, { schemaVersion: 2 }));
      await writeJsonFile(path.join(trialDir, 'result.json'), researchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'unsupported metadata schemaVersion: 2'
      ]);
    });
  });

  it('marks metadata ids that do not match trial directories invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-id-mismatch';
      const metadataId = '2026-06-30T123456Z-other-trial';
      const trialDir = await makeResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), {
        ...researchMetadata(id),
        id: metadataId
      });
      await writeJsonFile(path.join(trialDir, 'result.json'), researchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        `metadata id ${metadataId} does not match research trial id ${id}`
      ]);
    });
  });

  it('marks metadata result paths that do not point to result.json invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-result-path-mismatch';
      const resultPath = 'other-result.json';
      const trialDir = await makeResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), {
        ...researchMetadata(id),
        result: resultPath
      });
      await writeJsonFile(path.join(trialDir, 'result.json'), researchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        `metadata result ${resultPath} does not point to result.json`
      ]);
    });
  });

  it('marks metadata and result status mismatches invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-status-mismatch';
      const trialDir = await makeResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), researchMetadata(id, { status: 'passed' }));
      await writeJsonFile(path.join(trialDir, 'result.json'), researchResult('failed'));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'metadata status passed does not match result status failed'
      ]);
    });
  });

  it('marks result summary totals that do not match result count invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-summary-mismatch';
      const trialDir = await makeResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), researchMetadata(id));
      await writeJsonFile(path.join(trialDir, 'result.json'), researchResult('passed', { summaryTotal: 2 }));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'result summary total 2 does not match results length 1'
      ]);
    });
  });

  it('does not rewrite research trial files while reading invalid candidates', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-malformed-result';
      const trialDir = await makeResearchTrialDir(dir, id);
      const metadataPath = path.join(trialDir, 'metadata.json');
      const resultPath = path.join(trialDir, 'result.json');

      await writeJsonFile(metadataPath, researchMetadata(id));
      await writeFile(resultPath, '{\n');

      const metadataBefore = await readFile(metadataPath, 'utf8');
      const resultBefore = await readFile(resultPath, 'utf8');

      readResearchTrials({ cwd: dir });

      assert.equal(await readFile(metadataPath, 'utf8'), metadataBefore);
      assert.equal(await readFile(resultPath, 'utf8'), resultBefore);
    });
  });
});

describe('research report builder', () => {
  it('builds an empty report from an empty reader result', () => {
    assert.deepStrictEqual(buildResearchReport([]), {
      schemaVersion: 1,
      trialSummary: {
        passed: 0,
        failed: 0,
        disallowed: 0,
        error: 0,
        invalid: 0,
        total: 0
      },
      taskSummary: {
        passed: 0,
        failed: 0,
        disallowed: 0,
        error: 0,
        total: 0
      },
      trials: []
    });
  });

  it('aggregates valid and invalid research trial reader results', async () => {
    await withTempDir(async (dir) => {
      await writeResearchTrial(dir, '2026-07-01T000001Z-passed');
      await writeResearchTrial(dir, '2026-06-30T123456Z-failed', { status: 'failed' });
      await writeResearchTrial(dir, 'broken-trial');

      assert.deepStrictEqual(buildResearchReport(readResearchTrials({ cwd: dir })), {
        schemaVersion: 1,
        trialSummary: {
          passed: 1,
          failed: 1,
          disallowed: 0,
          error: 0,
          invalid: 1,
          total: 3
        },
        taskSummary: {
          passed: 1,
          failed: 1,
          disallowed: 0,
          error: 0,
          total: 2
        },
        trials: [
          {
            id: '2026-07-01T000001Z-passed',
            createdAt: '2026-07-01T00:00:01.000Z',
            collaborator: 'claude-sonnet-4',
            benchmark: 'benchmarks/quantum-katas',
            status: 'passed',
            summary: {
              passed: 1,
              failed: 0,
              disallowed: 0,
              error: 0,
              total: 1
            },
            path: 'research/runs/2026-07-01T000001Z-passed'
          },
          {
            id: '2026-06-30T123456Z-failed',
            createdAt: '2026-06-30T12:34:56.000Z',
            collaborator: 'claude-sonnet-4',
            benchmark: 'benchmarks/quantum-katas',
            status: 'failed',
            summary: {
              passed: 0,
              failed: 1,
              disallowed: 0,
              error: 0,
              total: 1
            },
            path: 'research/runs/2026-06-30T123456Z-failed'
          },
          {
            id: 'broken-trial',
            createdAt: null,
            collaborator: null,
            benchmark: null,
            status: 'invalid',
            summary: {
              passed: 0,
              failed: 0,
              disallowed: 0,
              error: 0,
              total: 0
            },
            path: 'research/runs/broken-trial',
            invalidReason: ['invalid research trial id: broken-trial']
          }
        ]
      });
    });
  });
});
