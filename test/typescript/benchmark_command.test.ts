import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { streamChunkText } from '../../src/commands/benchmark_command';
import { createDispatcher } from '../../src/dispatcher';
import { gradeBenchmarkSuite } from '../../src/evaluation_runner';

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
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-benchmark-'));

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

describe('benchmark command TypeScript route', () => {
  it('decodes Uint8Array stream chunks as UTF-8 text', () => {
    assert.equal(streamChunkText(new Uint8Array([97, 98])), 'ab');
  });

  it('classifies invalid task frontmatter as an error result', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: basic-gates/state-flip',
        'title: StateFlip',
        'source: test',
        'difficulty: smoke',
        'checks:',
        '  tolerance: 1e-9',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n'));

      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'task.md',
        'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(result.stdout, 'ERROR benchmark run\nerror: allowed_commands is required\n');
      assert.equal(result.stderr, '');
    });
  });

  it('classifies malformed YAML frontmatter as an error result', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: basic-gates/state-flip',
        'title: "StateFlip',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-9',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n'));

      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'task.md',
        'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.match(result.stdout, /^ERROR benchmark run\nerror: invalid YAML frontmatter: Missing closing "quote/mu);
      assert.equal(result.stderr, '');
    });
  });

  it('classifies submission syntax errors as error results', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit "0 --step 0\n');

      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'submission.qni'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(result.stdout, [
        'ERROR StateFlip',
        'error: unterminated quote in command: qni add X --qubit "0 --step 0',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('classifies qni command execution failures as error results', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit nope --step 0\n');

      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'submission.qni'
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(result.stdout, [
        'ERROR StateFlip',
        'error: submission command failed at line 1: qni add X --qubit nope --step 0',
        'qubit must be an integer',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON error status and exit code for qni command execution failures', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit nope --step 0\n');

      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'submission.qni',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 3);
      assert.equal(payload.status, 'error');
      assert.equal(payload.exitCode, 3);
      assert.equal(payload.taskId, 'basic-gates/state-flip');
      assert.equal(payload.title, 'StateFlip');
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON passed status and exit code for correct submissions', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0);
      assert.deepStrictEqual(payload, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'run', status: 'passed' }]
      });
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON failed status and exit code for wrong answers', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 1);
      assert.deepStrictEqual(payload, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni',
        status: 'failed',
        exitCode: 1,
        checks: [{ type: 'run', status: 'failed' }]
      });
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON disallowed status and exit code for rejected submissions', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 2);
      assert.deepStrictEqual(payload, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni',
        status: 'disallowed',
        exitCode: 2,
        checks: []
      });
      assert.equal(result.stderr, '');
    });
  });

  it('rejects submission commands not listed in allowed_commands', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: basic-gates/state-flip',
        'title: StateFlip',
        'source: test',
        'difficulty: smoke',
        'allowed_commands: # commands students may use',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-9',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni run\n');

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);

      assert.equal(result.exitStatus, 2, result.stderr);
      assert.equal(result.stdout, [
        'DISALLOWED StateFlip',
        'rejected: line 1: qni run',
        'allowed commands: qni add',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('preflights the whole submission before executing allowed commands', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: basic-gates/state-flip',
        'title: StateFlip',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:   ',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-9',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), [
        'qni add H --qubit nope --step 0',
        'qni run',
        ''
      ].join('\n'));

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);

      assert.equal(result.exitStatus, 2, result.stderr);
      assert.equal(result.stdout, [
        'DISALLOWED StateFlip',
        'rejected: line 2: qni run',
        'allowed commands: qni add',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('uses checks.tolerance from the task file during run checks', async () => {
    await withTempDir(async (dir) => {
      const taskLines = (tolerance: string) => [
        '---',
        'id: numeric/tolerance',
        'title: ToleranceCheck',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        `  tolerance: ${tolerance}`,
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 0.999999999999',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n');
      await writeFile(path.join(dir, 'loose.md'), taskLines('1e-11'));
      await writeFile(path.join(dir, 'tight.md'), taskLines('1e-13'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit 0 --step 0\n');

      const loose = captureDispatcherRun(dir, ['benchmark', 'run', 'loose.md', 'submission.qni']);
      const tight = captureDispatcherRun(dir, ['benchmark', 'run', 'tight.md', 'submission.qni']);

      assert.equal(loose.exitStatus, 0, loose.stderr);
      assert.equal(tight.exitStatus, 1, tight.stderr);
    });
  });

  it('fails instead of aborting when the actual state vector is shorter than expected', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: output/short-actual',
        'title: ShortActual',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-12',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|10>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Prepare a two-qubit state.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit 0 --step 0\n');

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.ok(result.stdout.includes('FAIL ShortActual\n'));
      assert.ok(result.stdout.includes('  - |10>: expected 1, actual 0\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('passes the PlusState solution using the task tolerance for rounded amplitudes', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/superposition/plus-state.md',
        'benchmarks/solutions/quantum-katas/superposition/plus-state.qni'
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, 'PASS PlusState\nchecks: 1\n');
      assert.equal(result.stderr, '');
    });
  });

  it('passes the BellState solution using an expect check', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/superposition/bell-state.md',
        'benchmarks/solutions/quantum-katas/superposition/bell-state.qni'
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, 'PASS BellState\nchecks: 1\n');
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON expect check status for the BellState solution', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/superposition/bell-state.md',
        'benchmarks/solutions/quantum-katas/superposition/bell-state.qni',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.deepEqual(payload, {
        taskId: 'superposition/bell-state',
        title: 'BellState',
        submission: 'benchmarks/solutions/quantum-katas/superposition/bell-state.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'expect', status: 'passed' }]
      });
      assert.equal(result.stderr, '');
    });
  });

  it('uses checks.tolerance from the task file during expect checks', async () => {
    await withTempDir(async (dir) => {
      const taskLines = (tolerance: string) => [
        '---',
        'id: numeric/expect-tolerance',
        'title: ExpectTolerance',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        `  tolerance: ${tolerance}`,
        '  items:',
        '    - type: expect',
        '      expected:',
        '        - pauli: ZZ',
        '          value: 0.999999999999',
        '---',
        '',
        'Prepare a Bell state.'
      ].join('\n');
      await writeFile(path.join(dir, 'loose.md'), taskLines('1e-11'));
      await writeFile(path.join(dir, 'tight.md'), taskLines('1e-13'));
      await writeFile(path.join(dir, 'submission.qni'), [
        'qni add H --qubit 0 --step 0',
        'qni add X --control 0 --qubit 1 --step 1',
        ''
      ].join('\n'));

      const loose = captureDispatcherRun(dir, ['benchmark', 'run', 'loose.md', 'submission.qni']);
      const tight = captureDispatcherRun(dir, ['benchmark', 'run', 'tight.md', 'submission.qni']);

      assert.equal(loose.exitStatus, 0, loose.stderr);
      assert.equal(tight.exitStatus, 1, tight.stderr);
      assert.ok(tight.stdout.includes('FAIL ExpectTolerance\n'));
      assert.ok(tight.stdout.includes('- expect #1: expectation values did not match expected values\n'));
    });
  });

  it('fails the StateFlip incorrect sample with human-readable failed check details', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run',
        'benchmarks/quantum-katas/basic-gates/state-flip.md',
        'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni'
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(result.stdout, [
        'FAIL StateFlip',
        'checks: 1',
        'failed checks:',
        '- run #1: state vector did not match expected amplitudes',
        '  expected / actual mismatches:',
        '  - |0>: expected 0, actual 0.7071067811865475',
        '  - |1>: expected 1, actual 0.7071067811865475',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('limits failed check details to mismatched amplitudes that fit human-readable output', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: output/large-failure',
        'title: LargeFailure',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-12',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|00000>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Keep the five-qubit zero state.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), [
        'qni add H --qubit 0 --step 0',
        'qni add H --qubit 1 --step 0',
        'qni add H --qubit 2 --step 0',
        'qni add H --qubit 3 --step 0',
        'qni add H --qubit 4 --step 0',
        ''
      ].join('\n'));

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);
      const detailLines = result.stdout
        .split('\n')
        .filter((line) => line.startsWith('  - |'));

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(detailLines.length, 16);
      assert.ok(result.stdout.includes('  ... 16 more mismatched amplitudes omitted\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('parses scientific notation in imaginary amplitudes during run checks', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: numeric/small-rx',
        'title: SmallRx',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-18',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|0>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 0',
        '            imaginary: -1.5707963267948965e-15',
        '---',
        '',
        'Apply a tiny Rx rotation.'
      ].join('\n'));
      await writeFile(
        path.join(dir, 'submission.qni'),
        'qni add Rx --angle pi/1000000000000000 --qubit 0 --step 0\n'
      );

      const result = captureDispatcherRun(dir, ['benchmark', 'run', 'task.md', 'submission.qni']);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, 'PASS SmallRx\nchecks: 1\n');
      assert.equal(result.stderr, '');
    });
  });

  it('returns suite grading through a reusable seam without writing the suite output', async () => {
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
      assert.deepStrictEqual(captured.value.results.map((result) => ({
        taskId: result.taskId,
        status: result.status,
        exitCode: result.exitCode,
        checks: result.checks
      })), [
        {
          taskId: 'basic-gates/state-flip',
          status: 'passed',
          exitCode: 0,
          checks: [{ type: 'run', status: 'passed' }]
        },
        {
          taskId: 'superposition/bell-state',
          status: 'passed',
          exitCode: 0,
          checks: [{ type: 'expect', status: 'passed' }]
        },
        {
          taskId: 'superposition/plus-state',
          status: 'passed',
          exitCode: 0,
          checks: [{ type: 'run', status: 'passed' }]
        }
      ]);
    });
  });

  it('runs the Quantum Katas smoke benchmark suite', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run-all',
        'benchmarks/quantum-katas',
        'benchmarks/solutions/quantum-katas'
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, [
        'PASS benchmark suite',
        'tasks: 3',
        'passed: 3, failed: 0, disallowed: 0, error: 0',
        '- passed basic-gates/state-flip StateFlip',
        '- passed superposition/bell-state BellState',
        '- passed superposition/plus-state PlusState',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });

  it('writes JSON for the Quantum Katas smoke benchmark suite', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        'benchmark',
        'run-all',
        'benchmarks/quantum-katas',
        'benchmarks/solutions/quantum-katas',
        '--json'
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.deepStrictEqual(payload, {
        status: 'passed',
        exitCode: 0,
        summary: {
          total: 3,
          passed: 3,
          failed: 0,
          disallowed: 0,
          error: 0
        },
        results: [
          {
            taskId: 'basic-gates/state-flip',
            title: 'StateFlip',
            task: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
            submission: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni',
            status: 'passed',
            exitCode: 0,
            checks: [{ type: 'run', status: 'passed' }]
          },
          {
            taskId: 'superposition/bell-state',
            title: 'BellState',
            task: 'benchmarks/quantum-katas/superposition/bell-state.md',
            submission: 'benchmarks/solutions/quantum-katas/superposition/bell-state.qni',
            status: 'passed',
            exitCode: 0,
            checks: [{ type: 'expect', status: 'passed' }]
          },
          {
            taskId: 'superposition/plus-state',
            title: 'PlusState',
            task: 'benchmarks/quantum-katas/superposition/plus-state.md',
            submission: 'benchmarks/solutions/quantum-katas/superposition/plus-state.qni',
            status: 'passed',
            exitCode: 0,
            checks: [{ type: 'run', status: 'passed' }]
          }
        ]
      });
      assert.equal(result.stderr, '');
    });
  });

  it('returns a non-zero suite status when any benchmark task fails', async () => {
    await withTempDir(async (dir) => {
      const benchmarkDir = path.join(dir, 'benchmarks');
      const solutionsDir = path.join(dir, 'solutions');
      await mkdir(path.join(benchmarkDir, 'basic-gates'), { recursive: true });
      await mkdir(path.join(solutionsDir, 'basic-gates'), { recursive: true });
      await writeFile(path.join(benchmarkDir, 'basic-gates', 'state-flip.md'), [
        '---',
        'id: basic-gates/state-flip',
        'title: StateFlip',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'checks:',
        '  tolerance: 1e-9',
        '  items:',
        '    - type: run',
        '      expected:',
        '        - basis: "|1>"',
        '          amplitude:',
        '            real: 1',
        '            imaginary: 0',
        '---',
        '',
        'Flip the state.'
      ].join('\n'));
      await writeFile(path.join(solutionsDir, 'basic-gates', 'state-flip.qni'), 'qni add H --qubit 0 --step 0\n');

      const result = captureDispatcherRun(dir, ['benchmark', 'run-all', 'benchmarks', 'solutions']);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(result.stdout, [
        'FAIL benchmark suite',
        'tasks: 1',
        'passed: 0, failed: 1, disallowed: 0, error: 0',
        '- failed basic-gates/state-flip StateFlip',
        ''
      ].join('\n'));
      assert.equal(result.stderr, '');
    });
  });
});
