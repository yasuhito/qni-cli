import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';
import { researchStatusExitCode, type StoredResearchStatus } from './helpers/research_trial';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface CapturedValue<T> {
  readonly stderr: string;
  readonly stdout: string;
  readonly value: T;
}

interface PlotTrialOptions {
  readonly benchmark?: string;
  readonly collaborator?: string;
  readonly cost?: Record<string, unknown>;
  readonly model?: Record<string, unknown>;
  readonly resultContent?: string;
  readonly resultTaskIds?: readonly string[];
  readonly score?: Record<string, unknown>;
  readonly status?: StoredResearchStatus;
  readonly taskSelection?: readonly string[];
  readonly taskSelectionMode?: 'full' | 'selected';
  readonly tokens?: Record<string, unknown>;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-plot-'));

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

function captureDispatcherRun(cwd: string, argv: string[]): CapturedRun {
  const captured = captureProcessWrites(() => {
    const dispatcher = createDispatcher({
      cwd,
      env: { PATH: '' },
      projectRoot: process.cwd()
    });

    return dispatcher.run(argv);
  });

  return {
    exitStatus: captured.value,
    stderr: captured.stderr,
    stdout: captured.stdout
  };
}

async function writePlotTrial(dir: string, id: string, options: PlotTrialOptions = {}): Promise<void> {
  const status = options.status ?? 'passed';
  const trialDir = path.join(dir, 'research', 'runs', id);

  await mkdir(trialDir, { recursive: true });
  await writeJsonFile(path.join(trialDir, 'metadata.json'), {
    schemaVersion: 1,
    id,
    createdAt: createdAtForResearchTrialId(id),
    collaborator: options.collaborator ?? 'gpt-4.1-mini',
    benchmark: options.benchmark ?? 'benchmarks/quantum-katas',
    submissions: 'submissions',
    prompt: 'prompt.md',
    response: 'response.md',
    result: 'result.json',
    status,
    ...(options.taskSelection === undefined ? {} : { taskSelection: options.taskSelection }),
    ...(options.taskSelectionMode === undefined ? {} : { taskSelectionMode: options.taskSelectionMode }),
    ...(options.score === undefined ? {
      score: {
        passed: status === 'passed' ? 22 : 21,
        total: 22,
        percent: status === 'passed' ? 100 : 95.45454545454545,
        source: 'result.json'
      }
    } : { score: options.score }),
    ...(options.tokens === undefined ? {
      tokens: {
        inputTokens: 12345,
        outputTokens: 6789,
        totalTokens: 19134,
        source: 'provider_usage'
      }
    } : { tokens: options.tokens }),
    ...(options.cost === undefined ? {
      cost: {
        totalUsd: 0.1234,
        perProblemUsd: 0.005609090909090909,
        source: 'estimated_from_model_registry'
      }
    } : { cost: options.cost }),
    ...(options.model === undefined ? {
      model: {
        registryId: 'gpt-4.1-mini',
        provider: 'openai-compatible',
        apiModel: 'gpt-4.1-mini'
      }
    } : { model: options.model })
  });
  await writeFile(
    path.join(trialDir, 'result.json'),
    options.resultContent ?? `${JSON.stringify(storedResearchResult(
      status,
      options.resultTaskIds ?? options.taskSelection ?? ['task-1']
    ), null, 2)}\n`
  );
}

async function writeInvalidMetricsTrial(dir: string, id: string): Promise<void> {
  await writePlotTrial(dir, id, {
    cost: {},
    model: {},
    score: {
      passed: 1,
      total: 1,
      percent: 100,
      source: 'result.json'
    }
  });
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function storedResearchResult(
  status: StoredResearchStatus = 'passed',
  taskIds: readonly string[] = ['task-1']
): Record<string, unknown> {
  return {
    status,
    exitCode: researchStatusExitCode(status),
    summary: {
      total: taskIds.length,
      passed: status === 'passed' ? taskIds.length : Math.max(0, taskIds.length - 1),
      failed: status === 'failed' ? 1 : 0,
      disallowed: status === 'disallowed' ? 1 : 0,
      error: status === 'error' ? 1 : 0
    },
    results: taskIds.map((taskId) => ({ taskId }))
  };
}

function createdAtForResearchTrialId(id: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})Z/u.exec(id);

  if (!match) {
    return '2026-06-30T12:34:56.000Z';
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function snapshotDirectory(dir: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  await addDirectorySnapshot(snapshot, dir, '');
  return snapshot;
}

async function addDirectorySnapshot(snapshot: Map<string, string>, root: string, relativeDir: string): Promise<void> {
  const absoluteDir = path.join(root, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(relativeDir, entry.name);
    const absolutePath = path.join(root, relativePath);

    if (entry.isDirectory()) {
      snapshot.set(`${relativePath}/`, '<dir>');
      await addDirectorySnapshot(snapshot, root, relativePath);
    } else if (entry.isFile()) {
      snapshot.set(relativePath, await readFile(absolutePath, 'utf8'));
    }
  }
}

describe('research plot command', () => {
  it('creates a self-contained HTML scatter plot with model-labelled trial details', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-gpt-4-1-mini', { status: 'failed' });
      const outputPath = path.join(dir, 'research', 'plots', 'cost-vs-score.html');

      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, 'old plot\n');

      const result = captureDispatcherRun(dir, [
        'research',
        'plot',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--output',
        'research/plots/cost-vs-score.html'
      ]);
      const html = await readFile(outputPath, 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, 'Wrote research plot: research/plots/cost-vs-score.html\n');
      assert.equal(await fileExists(outputPath), true);
      assert.ok(!html.includes('old plot'));
      assert.ok(html.startsWith('<!doctype html>'));
      assert.ok(html.includes('<svg'));
      assert.ok(!html.includes('<script src='));
      assert.ok(!html.includes('https://'));
      assert.ok(html.includes('Cost per problem (USD, linear)'));
      assert.ok(html.includes('Score percent (linear)'));
      assert.ok(html.includes('data-trial-id="2026-07-02T000001Z-gpt-4-1-mini"'));
      assert.ok(html.includes('gpt-4.1-mini'));
      assert.ok(html.includes('<td><code>2026-07-02T000001Z-gpt-4-1-mini</code></td>'));
      assert.ok(html.includes('<td><code>benchmarks/quantum-katas</code></td>'));
      assert.ok(html.includes('<td>failed</td>'));
      assert.ok(html.includes('<td>21/22</td>'));
      assert.ok(html.includes('<td>input 12345, output 6789, total 19134</td>'));
      assert.ok(html.includes('<td>$0.1234</td>'));
      assert.ok(html.includes('<td>$0.00560909</td>'));
    });
  });

  it('uses the collaborator name as the point label when model registry id is missing', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-human-researcher', {
        collaborator: 'human-researcher',
        cost: {
          totalUsd: 0,
          perProblemUsd: 0,
          source: 'estimated_from_model_registry'
        },
        model: {},
        tokens: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          source: 'provider_usage'
        }
      });

      const result = captureDispatcherRun(dir, [
        'research',
        'plot',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--output',
        'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.ok(html.includes('human-researcher'));
    });
  });

  it('excludes trials whose result task ids cannot be read', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-metadata-only', {
        resultContent: '{\n'
      });

      const result = captureDispatcherRun(dir, [
        'research',
        'plot',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--output',
        'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.ok(!html.includes('data-trial-id="2026-07-02T000001Z-metadata-only"'));
      assert.match(html, /<li>invalid trial: 1<\/li>/u);
    });
  });

  it('shows exclusion counts and does not modify research runs', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-gpt-4-1-mini');
      await writePlotTrial(dir, 'broken-trial');
      await writePlotTrial(dir, '2026-07-02T000002Z-other-benchmark', {
        benchmark: 'benchmarks/other-suite',
        collaborator: 'other-model'
      });
      await writeInvalidMetricsTrial(dir, '2026-07-02T000003Z-missing-cost');
      const runsDir = path.join(dir, 'research', 'runs');
      const before = await snapshotDirectory(runsDir);

      const result = captureDispatcherRun(dir, [
        'research',
        'plot',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--output',
        'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');
      const after = await snapshotDirectory(runsDir);

      assert.equal(result.exitStatus, 0);
      assert.deepStrictEqual(after, before);
      assert.ok(html.includes('<li>invalid trial: 1</li>'));
      assert.ok(html.includes('<li>benchmark mismatch: 1</li>'));
      assert.ok(html.includes('<li>missing or invalid metrics: 1</li>'));
    });
  });

  it('plots only trials with the requested task selection', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-full');
      await writePlotTrial(dir, '2026-07-02T000002Z-subset', { taskSelection: ['task-1'] });

      const result = captureDispatcherRun(dir, [
        'research', 'plot', '--benchmark', 'benchmarks/quantum-katas',
        '--task', 'task-1', '--output', 'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.match(html, /2026-07-02T000002Z-subset/u);
      assert.doesNotMatch(html, /2026-07-02T000001Z-full/u);
    });
  });

  it('excludes trials whose recorded task selection differs from result task ids', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-inconsistent-selection', {
        resultTaskIds: ['task-2'],
        taskSelection: ['task-1']
      });

      const result = captureDispatcherRun(dir, [
        'research', 'plot', '--benchmark', 'benchmarks/quantum-katas',
        '--task', 'task-1', '--output', 'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.doesNotMatch(html, /data-trial-id="2026-07-02T000001Z-inconsistent-selection"/u);
      assert.match(html, /<li>invalid trial: 1<\/li>/u);
    });
  });

  it('plots a new full-suite trial when task selection is omitted', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-full', {
        taskSelection: ['task-1'],
        taskSelectionMode: 'full'
      });

      const result = captureDispatcherRun(dir, [
        'research', 'plot', '--benchmark', 'benchmarks/quantum-katas', '--output', 'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.match(html, /2026-07-02T000001Z-full/u);
    });
  });

  it('plots only full-suite trials with the same result task ids', async () => {
    await withTempDir(async (dir) => {
      await writePlotTrial(dir, '2026-07-02T000001Z-old-task-set', {
        resultTaskIds: ['task-1']
      });
      await writePlotTrial(dir, '2026-07-02T000002Z-new-task-set', {
        resultTaskIds: ['task-2']
      });

      const result = captureDispatcherRun(dir, [
        'research', 'plot', '--benchmark', 'benchmarks/quantum-katas', '--output', 'plot.html'
      ]);
      const html = await readFile(path.join(dir, 'plot.html'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.match(html, /data-trial-id="2026-07-02T000002Z-new-task-set"/u);
      assert.doesNotMatch(html, /data-trial-id="2026-07-02T000001Z-old-task-set"/u);
      assert.match(html, /<li>benchmark mismatch: 1<\/li>/u);
    });
  });

  it('rejects incomplete plot arguments before writing HTML', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'research',
        'plot',
        '--benchmark',
        'benchmarks/quantum-katas'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Usage: qni research plot --benchmark <dir> \[--task <task-id> \.\.\.\] --output <file>/u);
      assert.equal(await fileExists(path.join(dir, 'plot.html')), false);
    });
  });
});
