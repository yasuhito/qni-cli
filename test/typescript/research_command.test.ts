import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';
import { type StoredResearchStatus, writeStoredResearchTrial } from './helpers/research_trial';

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

type UnsuccessfulResearchStatus = Exclude<StoredResearchStatus, 'passed'>;

const UNSUCCESSFUL_RESEARCH_TRIAL_CASES: readonly {
  readonly exitCode: number;
  readonly status: UnsuccessfulResearchStatus;
}[] = [
  { exitCode: 1, status: 'failed' },
  { exitCode: 2, status: 'disallowed' },
  { exitCode: 3, status: 'error' }
];

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

async function prepareQuantumKatasSubmissions(
  dir: string,
  submissionsDir: string,
  status: UnsuccessfulResearchStatus
): Promise<void> {
  const relativePaths = [
    'basic-gates/basis-change.qni',
    'basic-gates/bell-state-change-1.qni',
    'basic-gates/bell-state-change-2.qni',
    'basic-gates/bell-state-change-3.qni',
    'basic-gates/fredkin-gate.qni',
    'basic-gates/phase-change-pi-over-3.qni',
    'basic-gates/phase-flip.qni',
    'basic-gates/sign-flip.qni',
    'basic-gates/state-flip.qni',
    'basic-gates/toffoli-gate.qni',
    'basic-gates/two-qubit-gate-1.qni',
    'basic-gates/two-qubit-gate-2.qni',
    'basic-gates/two-qubit-gate-3.qni',
    'basic-gates/two-qubit-gate-4.qni',
    'superposition/all-basis-vector-with-phase-flip-two-qubits.qni',
    'superposition/all-basis-vectors-two-qubits.qni',
    'superposition/all-basis-vectors-with-phases-two-qubits.qni',
    'superposition/bell-state.qni',
    'superposition/ghz-state.qni',
    'superposition/minus-state.qni',
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
    ['basic-gates/basis-change.qni', 'qni add H --qubit 0 --step 0\n'],
    ['basic-gates/bell-state-change-1.qni', 'qni add Z --qubit 0 --step 0\n'],
    ['basic-gates/bell-state-change-2.qni', 'qni add X --qubit 0 --step 0\n'],
    ['basic-gates/bell-state-change-3.qni', 'qni add X --qubit 0 --step 0\nqni add Z --qubit 0 --step 1\n'],
    ['basic-gates/fredkin-gate.qni', 'qni add SWAP --control 0 --qubit 1,2 --step 0\n'],
    ['basic-gates/phase-change-pi-over-3.qni', 'qni add P --angle pi/3 --qubit 0 --step 0\n'],
    ['basic-gates/phase-flip.qni', 'qni add S --qubit 0 --step 0\n'],
    ['basic-gates/sign-flip.qni', 'qni add Z --qubit 0 --step 0\n'],
    ['basic-gates/state-flip.qni', 'qni add X --qubit 0 --step 0\n'],
    ['basic-gates/toffoli-gate.qni', 'qni add X --control 0,1 --qubit 2 --step 0\n'],
    ['basic-gates/two-qubit-gate-1.qni', 'qni add X --control 0 --qubit 1 --step 0\n'],
    ['basic-gates/two-qubit-gate-2.qni', 'qni add Z --control 0 --qubit 1 --step 0\n'],
    ['basic-gates/two-qubit-gate-3.qni', 'qni add SWAP --qubit 0,1 --step 0\n'],
    [
      'basic-gates/two-qubit-gate-4.qni',
      'qni add X --control 0 --qubit 1 --step 0\nqni add X --qubit 1 --step 1\n'
    ],
    [
      'superposition/all-basis-vector-with-phase-flip-two-qubits.qni',
      'qni add H --qubit 0 --step 0\nqni add H --qubit 1 --step 0\nqni add Z --control 0 --qubit 1 --step 1\n'
    ],
    ['superposition/all-basis-vectors-two-qubits.qni', 'qni add H --qubit 0 --step 0\nqni add H --qubit 1 --step 0\n'],
    [
      'superposition/all-basis-vectors-with-phases-two-qubits.qni',
      'qni add H --qubit 0 --step 0\nqni add H --qubit 1 --step 0\nqni add Z --qubit 0 --step 1\nqni add S --qubit 1 --step 1\n'
    ],
    ['superposition/bell-state.qni', 'qni add H --qubit 0 --step 0\nqni add X --control 0 --qubit 1 --step 1\n'],
    ['superposition/ghz-state.qni', 'qni add H --qubit 0 --step 0\nqni add X --control 0 --qubit 1 --step 1\nqni add X --control 0 --qubit 2 --step 2\n'],
    ['superposition/minus-state.qni', 'qni add X --qubit 0 --step 0\nqni add H --qubit 0 --step 1\n'],
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

async function researchTrialDirs(dir: string): Promise<string[]> {
  const runsDir = path.join(dir, 'research', 'runs');

  if (!(await directoryExists(runsDir))) {
    return [];
  }

  const entries = await readdir(runsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runsDir, entry.name))
    .sort();
}

async function singleTrialDir(dir: string): Promise<string> {
  const trialDirs = await researchTrialDirs(dir);

  assert.equal(trialDirs.length, 1);
  return trialDirs[0] ?? '';
}

async function directoryExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', [...args], { cwd, encoding: 'utf8' }).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
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

describe('research command TypeScript route', () => {
  it('prints research help with record and report subcommands', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['research', '--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /qni research record/u);
      assert.match(result.stdout, /qni research report/u);
    });
  });

  it('prints research report help with usage, target path, JSON, and exit codes', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['research', 'report', '--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, [
        'Usage:',
        '  qni research report [--json]',
        '',
        'Overview:',
        '  Show a report for saved research trials under research/runs/',
        '  By default, output is dependency-free plaintext for terminal reading.',
        '  Use --json for the existing machine-readable report.',
        '',
        'Output:',
        '  summary of trial statuses',
        '  summary of benchmark task statuses',
        '  newest-first trial list',
        '  invalid details when invalid research trial directories exist',
        '',
        'Exit codes:',
        '  0  report generated and no invalid research trials were found',
        '  1  report generated and one or more invalid research trials were found',
        '  3  invalid arguments or research/runs/ could not be read',
        ''
      ].join('\n'));
    });
  });

  it('prints an empty human research report when no trials exist', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['research', 'report']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, [
        'Research trial report',
        'Research runs: research/runs',
        '',
        'Trial summary:',
        '  total: 0',
        '  passed: 0',
        '  failed: 0',
        '  disallowed: 0',
        '  error: 0',
        '  invalid: 0',
        '',
        'Task summary:',
        '  total: 0',
        '  passed: 0',
        '  failed: 0',
        '  disallowed: 0',
        '  error: 0',
        '',
        'No research trials found.',
        ''
      ].join('\n'));
    });
  });

  it('prints a human research report and exits with 1 when a trial is invalid', async () => {
    await withTempDir(async (dir) => {
      await writeStoredResearchTrial(dir, '2026-07-01T000004Z-error', { status: 'error' });
      await writeStoredResearchTrial(dir, '2026-07-01T000003Z-disallowed', { status: 'disallowed' });
      await writeStoredResearchTrial(dir, '2026-07-01T000002Z-failed', { status: 'failed' });
      await writeStoredResearchTrial(dir, '2026-07-01T000001Z-passed');
      await writeStoredResearchTrial(dir, 'broken-trial');

      const result = captureDispatcherRun(dir, ['research', 'report']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, [
        'Research trial report',
        'Research runs: research/runs',
        '',
        'Trial summary:',
        '  total: 5',
        '  passed: 1',
        '  failed: 1',
        '  disallowed: 1',
        '  error: 1',
        '  invalid: 1',
        '',
        'Task summary:',
        '  total: 4',
        '  passed: 1',
        '  failed: 1',
        '  disallowed: 1',
        '  error: 1',
        '',
        'Trials:',
        '  status       tasks  id',
        '  error        0/1    2026-07-01T000004Z-error',
        '    collaborator: claude-sonnet-4',
        '    benchmark: benchmarks/quantum-katas',
        '    path: research/runs/2026-07-01T000004Z-error',
        '  disallowed   0/1    2026-07-01T000003Z-disallowed',
        '    collaborator: claude-sonnet-4',
        '    benchmark: benchmarks/quantum-katas',
        '    path: research/runs/2026-07-01T000003Z-disallowed',
        '  failed       0/1    2026-07-01T000002Z-failed',
        '    collaborator: claude-sonnet-4',
        '    benchmark: benchmarks/quantum-katas',
        '    path: research/runs/2026-07-01T000002Z-failed',
        '  passed       1/1    2026-07-01T000001Z-passed',
        '    collaborator: claude-sonnet-4',
        '    benchmark: benchmarks/quantum-katas',
        '    path: research/runs/2026-07-01T000001Z-passed',
        '  invalid      -      broken-trial',
        '    path: research/runs/broken-trial',
        '',
        'Invalid details:',
        '  broken-trial',
        '    - invalid research trial id: broken-trial',
        ''
      ].join('\n'));
    });
  });

  it('prints an empty JSON research report when no trials exist', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['research', 'report', '--json']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.deepStrictEqual(JSON.parse(result.stdout) as unknown, {
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
  });

  it('prints a JSON research report and exits with 0 when only valid trials exist', async () => {
    await withTempDir(async (dir) => {
      await writeStoredResearchTrial(dir, '2026-07-01T000001Z-passed');

      const result = captureDispatcherRun(dir, ['research', 'report', '--json']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.deepStrictEqual(JSON.parse(result.stdout) as unknown, {
        schemaVersion: 1,
        trialSummary: {
          passed: 1,
          failed: 0,
          disallowed: 0,
          error: 0,
          invalid: 0,
          total: 1
        },
        taskSummary: {
          passed: 1,
          failed: 0,
          disallowed: 0,
          error: 0,
          total: 1
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
          }
        ]
      });
    });
  });

  it('prints a JSON research report and exits with 1 when a trial is invalid', async () => {
    await withTempDir(async (dir) => {
      await writeStoredResearchTrial(dir, '2026-07-01T000001Z-passed');
      await writeStoredResearchTrial(dir, 'broken-trial');

      const result = captureDispatcherRun(dir, ['research', 'report', '--json']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stderr, '');
      assert.deepStrictEqual(JSON.parse(result.stdout) as unknown, {
        schemaVersion: 1,
        trialSummary: {
          passed: 1,
          failed: 0,
          disallowed: 0,
          error: 0,
          invalid: 1,
          total: 2
        },
        taskSummary: {
          passed: 1,
          failed: 0,
          disallowed: 0,
          error: 0,
          total: 1
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

  it('returns exit code 3 when the research runs path cannot be read as a directory', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'research'), { recursive: true });
      await writeFile(path.join(dir, 'research', 'runs'), 'not a directory\n');

      const result = captureDispatcherRun(dir, ['research', 'report', '--json']);

      assert.equal(result.exitStatus, 3);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Research runs path is not a directory: research\/runs/u);
    });
  });

  it('rejects unsafe research trial slugs before creating a trial directory', async () => {
    for (const slug of ['Smoke_Claude', 'smoke--claude', 'smoke-', '-smoke', '../escape']) {
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
          slug
        ]);

        assert.equal(result.exitStatus, 3, slug);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, new RegExp(`Invalid --slug: ${escapeRegExp(slug)}`, 'u'));
        assert.match(result.stderr, /Use lowercase letters, digits, and hyphens between words/u);
        assert.deepStrictEqual(await researchTrialDirs(dir), []);
      });
    }
  });

  it('rejects missing research trial inputs before creating a trial directory', async () => {
    const cases = [
      {
        argv: ['--benchmark', 'missing-benchmark'],
        message: 'Benchmark suite directory does not exist: missing-benchmark',
        suggestion: 'Create the directory or pass a different --benchmark path.'
      },
      {
        argv: ['--submissions', 'missing-submissions'],
        message: 'Submissions directory does not exist: missing-submissions',
        suggestion: 'Create the directory or pass a different --submissions path.'
      },
      {
        argv: ['--prompt', 'missing-prompt.md'],
        message: 'Prompt file does not exist: missing-prompt.md',
        suggestion: 'Create the file or pass a different --prompt path.'
      },
      {
        argv: ['--response', 'missing-response.md'],
        message: 'AI response file does not exist: missing-response.md',
        suggestion: 'Create the file or pass a different --response path.'
      }
    ];

    for (const testCase of cases) {
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
          'smoke-claude',
          ...testCase.argv
        ]);

        assert.equal(result.exitStatus, 3, testCase.message);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, new RegExp(escapeRegExp(testCase.message), 'u'));
        assert.match(result.stderr, new RegExp(escapeRegExp(testCase.suggestion), 'u'));
        assert.deepStrictEqual(await researchTrialDirs(dir), []);
      });
    }
  });

  it('does not overwrite an existing research trial directory', async () => {
    await withFixedDateNow('2026-06-30T12:34:56.789Z', async () => {
      await withTempDir(async (dir) => {
        await prepareResearchInputs(dir);
        const existingTrialDir = path.join(dir, 'research', 'runs', '2026-06-30T123456Z-smoke-claude');
        const existingTrialFile = path.join(existingTrialDir, 'trial.md');

        await mkdir(existingTrialDir, { recursive: true });
        await writeFile(existingTrialFile, 'existing trial\n');
        const beforeTrialDirs = await researchTrialDirs(dir);

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

        assert.equal(result.exitStatus, 3);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /Research trial directory already exists: research\/runs\/2026-06-30T123456Z-smoke-claude/u);
        assert.match(result.stderr, /Choose a different --slug/u);
        assert.deepStrictEqual(await researchTrialDirs(dir), beforeTrialDirs);
        assert.equal(await readFile(existingTrialFile, 'utf8'), 'existing trial\n');
      });
    });
  });

  it('leaves existing research files unchanged when input validation fails', async () => {
    await withTempDir(async (dir) => {
      await prepareResearchInputs(dir);
      const existingTrialFile = path.join(dir, 'research', 'runs', 'existing-trial', 'trial.md');
      const workspaceFile = path.join(dir, 'workspace.txt');

      await mkdir(path.dirname(existingTrialFile), { recursive: true });
      await writeFile(existingTrialFile, 'existing trial\n');
      await writeFile(workspaceFile, 'keep me\n');
      const beforeTrialDirs = await researchTrialDirs(dir);

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
        'missing-prompt.md',
        '--response',
        'response.md',
        '--slug',
        'smoke-claude'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.deepStrictEqual(await researchTrialDirs(dir), beforeTrialDirs);
      assert.equal(await readFile(existingTrialFile, 'utf8'), 'existing trial\n');
      assert.equal(await readFile(workspaceFile, 'utf8'), 'keep me\n');
    });
  });

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
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-1.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-2.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-3.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'fredkin-gate.qni'))).isFile(), true);
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
        total: 21,
        passed: 21,
        failed: 0,
        disallowed: 0,
        error: 0
      });
      assert.ok(trialSummary.includes('- status: passed\n'));
      assert.equal(await readFile(path.join(trialDir, 'prompt.md'), 'utf8'), 'Solve the smoke benchmark suite.\n');
      assert.equal(await readFile(path.join(trialDir, 'response.md'), 'utf8'), 'I wrote the requested .qni submissions.\n');
      assert.equal((await stat(path.join(trialDir, 'submissions'))).isDirectory(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-1.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-2.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'bell-state-change-3.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'fredkin-gate.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'phase-change-pi-over-3.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'phase-flip.qni'))).isFile(), true);
      assert.equal((await stat(path.join(trialDir, 'submissions', 'basic-gates', 'sign-flip.qni'))).isFile(), true);
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
