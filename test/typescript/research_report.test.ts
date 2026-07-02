import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildResearchReport, readResearchTrials, type ResearchTrial } from '../../src/research_report';
import {
  makeStoredResearchTrialDir,
  storedResearchMetadata,
  storedResearchResult,
  writeJsonFile,
  writeStoredResearchTrial
} from './helpers/research_trial';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-report-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
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
      await writeStoredResearchTrial(dir, id);

      assert.deepStrictEqual(readResearchTrials({ cwd: dir }).map((trial) => trial.id), [id]);
    });
  });

  it('sorts research trial candidates by timestamp descending', async () => {
    await withTempDir(async (dir) => {
      await writeStoredResearchTrial(dir, '2026-06-30T123456Z-older');
      await writeStoredResearchTrial(dir, '2026-07-01T000001Z-newer');

      assert.deepStrictEqual(readResearchTrials({ cwd: dir }).map((trial) => trial.id), [
        '2026-07-01T000001Z-newer',
        '2026-06-30T123456Z-older'
      ]);
    });
  });

  it('reads valid research trials with report fields', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-smoke-claude';

      await writeStoredResearchTrial(dir, id);

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

  it('keeps score metadata out of research report fields', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-score-metadata';
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), storedResearchMetadata(id, {
        score: {
          percent: 'not a number',
          source: 123
        }
      }));
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult());

      const report = buildResearchReport(readResearchTrials({ cwd: dir }));

      assert.equal(Object.hasOwn(report.trials[0] ?? {}, 'score'), false);
      assert.equal(report.trials[0]?.status, 'passed');
    });
  });

  it('does not backfill score into existing research trial metadata while reading reports', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-without-score';
      const metadataPath = path.join(dir, 'research', 'runs', id, 'metadata.json');

      await writeStoredResearchTrial(dir, id);
      const before = await readFile(metadataPath, 'utf8');

      buildResearchReport(readResearchTrials({ cwd: dir }));

      assert.equal(await readFile(metadataPath, 'utf8'), before);
      assert.equal(Object.hasOwn(JSON.parse(before) as Record<string, unknown>, 'score'), false);
    });
  });

  it('keeps research trial candidates with invalid ids', async () => {
    await withTempDir(async (dir) => {
      await writeStoredResearchTrial(dir, 'broken-trial');

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
      const missingMetadataDir = await makeStoredResearchTrialDir(dir, missingMetadataId);
      const missingResultDir = await makeStoredResearchTrialDir(dir, missingResultId);

      await writeJsonFile(path.join(missingMetadataDir, 'result.json'), storedResearchResult());
      await writeJsonFile(path.join(missingResultDir, 'metadata.json'), storedResearchMetadata(missingResultId));

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
      const malformedMetadataDir = await makeStoredResearchTrialDir(dir, malformedMetadataId);
      const malformedResultDir = await makeStoredResearchTrialDir(dir, malformedResultId);

      await writeFile(path.join(malformedMetadataDir, 'metadata.json'), '{\n');
      await writeJsonFile(path.join(malformedMetadataDir, 'result.json'), storedResearchResult());
      await writeJsonFile(path.join(malformedResultDir, 'metadata.json'), storedResearchMetadata(malformedResultId));
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
      const unreadableMetadataDir = await makeStoredResearchTrialDir(dir, unreadableMetadataId);
      const unreadableResultDir = await makeStoredResearchTrialDir(dir, unreadableResultId);

      await mkdir(path.join(unreadableMetadataDir, 'metadata.json'));
      await writeJsonFile(path.join(unreadableMetadataDir, 'result.json'), storedResearchResult());
      await writeJsonFile(path.join(unreadableResultDir, 'metadata.json'), storedResearchMetadata(unreadableResultId));
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
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), storedResearchMetadata(id, { schemaVersion: 2 }));
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'unsupported metadata schemaVersion: 2'
      ]);
    });
  });

  it('marks metadata ids that do not match trial directories invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-id-mismatch';
      const metadataId = '2026-06-30T123456Z-other-trial';
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), {
        ...storedResearchMetadata(id),
        id: metadataId
      });
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        `metadata id ${metadataId} does not match research trial id ${id}`
      ]);
    });
  });

  it('marks metadata result paths that do not point to result.json invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-result-path-mismatch';
      const resultPath = 'other-result.json';
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), {
        ...storedResearchMetadata(id),
        result: resultPath
      });
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult());

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        `metadata result ${resultPath} does not point to result.json`
      ]);
    });
  });

  it('marks metadata and result status mismatches invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-status-mismatch';
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), storedResearchMetadata(id, { status: 'passed' }));
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult('failed'));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'metadata status passed does not match result status failed'
      ]);
    });
  });

  it('marks result summary totals that do not match result count invalid', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-summary-mismatch';
      const trialDir = await makeStoredResearchTrialDir(dir, id);

      await writeJsonFile(path.join(trialDir, 'metadata.json'), storedResearchMetadata(id));
      await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult('passed', { summaryTotal: 2 }));

      assert.deepStrictEqual(invalidReasonsById(readResearchTrials({ cwd: dir })).get(id), [
        'result summary total 2 does not match results length 1'
      ]);
    });
  });

  it('does not rewrite research trial files while reading invalid candidates', async () => {
    await withTempDir(async (dir) => {
      const id = '2026-06-30T123456Z-malformed-result';
      const trialDir = await makeStoredResearchTrialDir(dir, id);
      const metadataPath = path.join(trialDir, 'metadata.json');
      const resultPath = path.join(trialDir, 'result.json');

      await writeJsonFile(metadataPath, storedResearchMetadata(id));
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
      await writeStoredResearchTrial(dir, '2026-07-01T000001Z-passed');
      await writeStoredResearchTrial(dir, '2026-06-30T123456Z-failed', { status: 'failed' });
      await writeStoredResearchTrial(dir, 'broken-trial');

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
