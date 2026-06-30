import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

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

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-'));

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

async function prepareResearchInputs(dir: string): Promise<void> {
  await writeFile(path.join(dir, 'prompt.md'), 'Solve the smoke benchmark suite.\n');
  await writeFile(path.join(dir, 'response.md'), 'I wrote the requested .qni submissions.\n');
}

type UnsuccessfulResearchStatus = 'disallowed' | 'error' | 'failed';

const UNSUCCESSFUL_RESEARCH_TRIAL_CASES: readonly {
  readonly exitCode: number;
  readonly status: UnsuccessfulResearchStatus;
}[] = [
  { exitCode: 1, status: 'failed' },
  { exitCode: 2, status: 'disallowed' },
  { exitCode: 3, status: 'error' }
];

async function prepareQuantumKatasSubmissions(
  dir: string,
  submissionsDir: string,
  status: UnsuccessfulResearchStatus
): Promise<void> {
  const relativePaths = [
    'basic-gates/state-flip.qni',
    'superposition/bell-state.qni',
    'superposition/plus-state.qni'
  ];

  for (const relativePath of relativePaths) {
    const submissionPath = path.join(dir, submissionsDir, relativePath);

    await mkdir(path.dirname(submissionPath), { recursive: true });
    await writeFile(submissionPath, quantumKatasSubmissionContent(status, relativePath));
  }
}

function quantumKatasSubmissionContent(status: UnsuccessfulResearchStatus, relativePath: string): string {
  const passedSubmissions = new Map<string, string>([
    ['basic-gates/state-flip.qni', 'qni add X --qubit 0 --step 0\n'],
    ['superposition/bell-state.qni', 'qni add H --qubit 0 --step 0\nqni add X --control 0 --qubit 1 --step 1\n'],
    ['superposition/plus-state.qni', 'qni add H --qubit 0 --step 0\n']
  ]);

  if (relativePath === 'basic-gates/state-flip.qni') {
    switch (status) {
      case 'failed':
        return 'qni add H --qubit 0 --step 0\n';
      case 'disallowed':
        return 'qni run\n';
      case 'error':
        return 'qni add X --qubit nope --step 0\n';
    }
  }

  const content = passedSubmissions.get(relativePath);

  if (!content) {
    throw new Error(`unsupported Quantum Katas submission path: ${relativePath}`);
  }

  return content;
}

async function singleTrialDir(dir: string): Promise<string> {
  const runsDir = path.join(dir, 'research', 'runs');
  const entries = await readdir(runsDir, { withFileTypes: true });
  const trialDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runsDir, entry.name));

  assert.equal(trialDirs.length, 1);
  return trialDirs[0] ?? '';
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', [...args], { cwd, encoding: 'utf8' }).trim();
}

describe('research command TypeScript route', () => {
  for (const gradingCase of UNSUCCESSFUL_RESEARCH_TRIAL_CASES) {
    it(`records a ${gradingCase.status} research trial directory with grading output`, async () => {
      await withTempDir(async (dir) => {
        const submissionsDir = `${gradingCase.status}-submissions`;

        await prepareResearchInputs(dir);
        await prepareQuantumKatasSubmissions(dir, submissionsDir, gradingCase.status);

        const result = captureDispatcherRun(dir, [
          'research',
          'record',
          '--collaborator',
          'claude-sonnet-4',
          '--benchmark',
          'benchmarks/quantum-katas',
          '--submissions',
          submissionsDir,
          '--prompt',
          'prompt.md',
          '--response',
          'response.md',
          '--slug',
          `${gradingCase.status}-claude`
        ]);
        const trialDir = await singleTrialDir(dir);
        const trialId = path.basename(trialDir);
        const metadata = await readJsonFile(path.join(trialDir, 'metadata.json'));
        const gradingResult = await readJsonFile(path.join(trialDir, 'result.json'));
        const trialSummary = await readFile(path.join(trialDir, 'trial.md'), 'utf8');

        assert.equal(result.exitStatus, gradingCase.exitCode);
        assert.equal(result.stderr, '');
        assert.match(
          result.stdout,
          new RegExp(`^Recorded research trial: research/runs/\\d{4}-\\d{2}-\\d{2}T\\d{6}Z-${gradingCase.status}-claude\\n$`, 'u')
        );
        assert.match(trialId, new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{6}Z-${gradingCase.status}-claude$`, 'u'));
        assert.equal(metadata.status, gradingCase.status);
        assert.equal(gradingResult.status, gradingCase.status);
        assert.equal(gradingResult.exitCode, gradingCase.exitCode);
        assert.ok(trialSummary.includes(`- status: ${gradingCase.status}\n`));
        assert.equal((await stat(path.join(trialDir, 'submissions'))).isDirectory(), true);
        assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'state-flip.qni'))).isFile(), true);
      });
    });
  }

  it('records a passed research trial directory with grading output', async () => {
    await withTempDir(async (dir) => {
      await prepareResearchInputs(dir);

      const result = captureDispatcherRun(dir, [
        'research',
        'record',
        '--collaborator',
        'claude-sonnet-4',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--submissions',
        'benchmarks/solutions/quantum-katas',
        '--prompt',
        'prompt.md',
        '--response',
        'response.md',
        '--slug',
        'smoke-claude'
      ]);
      const trialDir = await singleTrialDir(dir);
      const trialId = path.basename(trialDir);
      const metadata = await readJsonFile(path.join(trialDir, 'metadata.json'));
      const gradingResult = await readJsonFile(path.join(trialDir, 'result.json'));
      const trialSummary = await readFile(path.join(trialDir, 'trial.md'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^Recorded research trial: research\/runs\/\d{4}-\d{2}-\d{2}T\d{6}Z-smoke-claude\n$/u);
      assert.match(trialId, /^\d{4}-\d{2}-\d{2}T\d{6}Z-smoke-claude$/u);
      assert.deepStrictEqual(metadata, {
        schemaVersion: 1,
        id: trialId,
        createdAt: metadata.createdAt,
        collaborator: 'claude-sonnet-4',
        benchmark: 'benchmarks/quantum-katas',
        submissions: 'submissions',
        prompt: 'prompt.md',
        response: 'response.md',
        result: 'result.json',
        status: 'passed'
      });
      assert.match(String(metadata.createdAt), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/u);
      assert.equal(gradingResult.status, 'passed');
      assert.deepStrictEqual(gradingResult.summary, {
        total: 3,
        passed: 3,
        failed: 0,
        disallowed: 0,
        error: 0
      });
      assert.ok(trialSummary.includes('- status: passed\n'));
      assert.equal(await readFile(path.join(trialDir, 'prompt.md'), 'utf8'), 'Solve the smoke benchmark suite.\n');
      assert.equal(await readFile(path.join(trialDir, 'response.md'), 'utf8'), 'I wrote the requested .qni submissions.\n');
      assert.equal((await stat(path.join(trialDir, 'submissions'))).isDirectory(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'state-flip.qni'))).isFile(), true);
    });
  });

  it('does not create a git commit while recording a passed research trial', async () => {
    await withTempDir(async (dir) => {
      git(dir, ['init']);
      await prepareResearchInputs(dir);
      await mkdir(path.join(dir, 'tracked'), { recursive: true });
      await writeFile(path.join(dir, 'tracked', 'baseline.txt'), 'baseline\n');
      git(dir, ['add', 'prompt.md', 'response.md', 'tracked/baseline.txt']);
      git(dir, ['-c', 'user.name=Qni Test', '-c', 'user.email=qni@example.test', 'commit', '-m', 'baseline']);
      const beforeHead = git(dir, ['rev-parse', 'HEAD']);

      const result = captureDispatcherRun(dir, [
        'research',
        'record',
        '--collaborator',
        'claude-sonnet-4',
        '--benchmark',
        'benchmarks/quantum-katas',
        '--submissions',
        'benchmarks/solutions/quantum-katas',
        '--prompt',
        'prompt.md',
        '--response',
        'response.md',
        '--slug',
        'smoke-claude'
      ]);
      const afterHead = git(dir, ['rev-parse', 'HEAD']);

      assert.equal(result.exitStatus, 0);
      assert.equal(afterHead, beforeHead);
    });
  });
});
