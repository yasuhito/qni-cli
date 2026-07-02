import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StoredResearchStatus = 'disallowed' | 'error' | 'failed' | 'passed';

export async function writeStoredResearchTrial(
  dir: string,
  id: string,
  options: {
    readonly benchmark?: string;
    readonly collaborator?: string;
    readonly status?: StoredResearchStatus;
    readonly summaryTotal?: number;
  } = {}
): Promise<void> {
  const status = options.status ?? 'passed';
  const trialDir = await makeStoredResearchTrialDir(dir, id);

  await writeJsonFile(path.join(trialDir, 'metadata.json'), storedResearchMetadata(id, {
    benchmark: options.benchmark,
    collaborator: options.collaborator,
    status
  }));
  await writeJsonFile(path.join(trialDir, 'result.json'), storedResearchResult(status, {
    summaryTotal: options.summaryTotal
  }));
}

export async function makeStoredResearchTrialDir(dir: string, id: string): Promise<string> {
  const trialDir = path.join(dir, 'research', 'runs', id);

  await mkdir(trialDir, { recursive: true });

  return trialDir;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function storedResearchMetadata(
  id: string,
  options: {
    readonly benchmark?: string;
    readonly collaborator?: string;
    readonly result?: string;
    readonly schemaVersion?: number;
    readonly score?: Record<string, unknown>;
    readonly status?: StoredResearchStatus;
  } = {}
): Record<string, unknown> {
  return {
    schemaVersion: options.schemaVersion ?? 1,
    id,
    createdAt: createdAtForResearchTrialId(id),
    collaborator: options.collaborator ?? 'claude-sonnet-4',
    benchmark: options.benchmark ?? 'benchmarks/quantum-katas',
    submissions: 'submissions',
    prompt: 'prompt.md',
    response: 'response.md',
    result: options.result ?? 'result.json',
    status: options.status ?? 'passed',
    ...optionalScore(options.score)
  };
}

function optionalScore(score: Record<string, unknown> | undefined): { readonly score?: Record<string, unknown> } {
  return score === undefined ? {} : { score };
}

export function storedResearchResult(
  status: StoredResearchStatus = 'passed',
  options: {
    readonly summaryTotal?: number;
  } = {}
): Record<string, unknown> {
  return {
    status,
    exitCode: researchStatusExitCode(status),
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
        exitCode: researchStatusExitCode(status),
        checks: [{ type: 'run', status: status === 'passed' ? 'passed' : 'failed' }]
      }
    ]
  };
}

export function createdAtForResearchTrialId(id: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})Z/u.exec(id);

  if (!match) {
    return '2026-06-30T12:34:56.000Z';
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`;
}

export function researchStatusExitCode(status: StoredResearchStatus): number {
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
