import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  benchmarkSuiteCommandReport,
  benchmarkTaskCommandReport
} from '../../src/commands/benchmark_output';
import {
  gradeBenchmarkSuite,
  gradeBenchmarkTask,
  gradeBenchmarkTaskForReport
} from '../../src/evaluation_runner';
import { captureProcessWrites, withTempDir } from './helpers/command';

describe('evaluation runner public entrypoints', () => {
  it('reports task frontmatter errors through the evaluation runner seam', async () => {
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

      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'task.md',
        submissionFile: 'submission.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: null,
        title: null,
        submission: 'submission.qni',
        status: 'error',
        exitCode: 3,
        checks: [],
        error: 'allowed_commands is required'
      });
    });
  });

  it('grades a single benchmark task without writing CLI output', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'run', status: 'passed' }]
      });
    });
  });

  it('grades expect checks through the evaluation runner seam', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/superposition/bell-state.md',
        submissionFile: 'benchmarks/solutions/quantum-katas/superposition/bell-state.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'superposition/bell-state',
        title: 'BellState',
        submission: 'benchmarks/solutions/quantum-katas/superposition/bell-state.qni',
        status: 'passed',
        exitCode: 0,
        checks: [{ type: 'expect', status: 'passed' }]
      });
    });
  });

  it('classifies failed run checks through the evaluation runner seam', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: 'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni',
        status: 'failed',
        exitCode: 1,
        checks: [{ type: 'run', status: 'failed' }]
      });
    });
  });

  it('grades every grading case in an isolated work directory', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: grading-cases/x-on-zero-and-one',
        'title: XOnZeroAndOne',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'grading_cases:',
        '  - id: zero-input',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|1>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '  - id: one-input',
        '    setup_commands:',
        '      - qni state set "|1>"',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|0>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '---',
        '',
        'Apply X to both basis inputs.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit 0 --step 0\n');

      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'task.md',
        submissionFile: 'submission.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'grading-cases/x-on-zero-and-one',
        title: 'XOnZeroAndOne',
        submission: 'submission.qni',
        status: 'passed',
        exitCode: 0,
        gradingCases: [
          {
            caseId: 'zero-input',
            status: 'passed',
            checks: [{ type: 'run', status: 'passed' }]
          },
          {
            caseId: 'one-input',
            status: 'passed',
            checks: [{ type: 'run', status: 'passed' }]
          }
        ],
        checks: [
          { type: 'run', status: 'passed' },
          { type: 'run', status: 'passed' }
        ]
      });
    });
  });

  it('fails the task when any grading case check fails', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: grading-cases/one-case-fails',
        'title: OneCaseFails',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'grading_cases:',
        '  - id: zero-input',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|1>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '  - id: one-input',
        '    setup_commands:',
        '      - qni state set "|1>"',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|1>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '---',
        '',
        'One case should fail.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), 'qni add X --qubit 0 --step 0\n');

      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'task.md',
        submissionFile: 'submission.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'grading-cases/one-case-fails',
        title: 'OneCaseFails',
        submission: 'submission.qni',
        status: 'failed',
        exitCode: 1,
        gradingCases: [
          {
            caseId: 'zero-input',
            status: 'passed',
            checks: [{ type: 'run', status: 'passed' }]
          },
          {
            caseId: 'one-input',
            status: 'failed',
            checks: [{ type: 'run', status: 'failed' }]
          }
        ],
        checks: [
          { type: 'run', status: 'passed' },
          { type: 'run', status: 'failed' }
        ]
      });
    });
  });

  it('classifies setup command failures as benchmark errors', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'task.md'), [
        '---',
        'id: grading-cases/setup-error',
        'title: SetupError',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'grading_cases:',
        '  - id: bad-setup',
        '    setup_commands:',
        '      - qni state set ""',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|0>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '---',
        '',
        'Setup should fail before checks run.'
      ].join('\n'));
      await writeFile(path.join(dir, 'submission.qni'), '');

      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'task.md',
        submissionFile: 'submission.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'grading-cases/setup-error',
        title: 'SetupError',
        submission: 'submission.qni',
        status: 'error',
        exitCode: 3,
        gradingCases: [
          {
            caseId: 'bad-setup',
            status: 'error',
            checks: [],
            error: [
              'setup command failed in grading case bad-setup: qni state set ',
              'initial state expression is required'
            ].join('\n')
          }
        ],
        checks: [],
        error: [
          'case bad-setup error: setup command failed in grading case bad-setup: qni state set ',
          'initial state expression is required'
        ].join('\n')
      });
    });
  });

  it('provides a single-task report that the benchmark adapter formats without regrading', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTaskForReport({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: 'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));
      const output = benchmarkTaskCommandReport(captured.value);

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.equal(output.exitCode, 1);
      assert.equal(output.humanOutput, [
        'FAIL StateFlip',
        'checks: 1',
        'failed checks:',
        '- run #1: state vector did not match expected amplitudes',
        '  expected / actual mismatches:',
        '  - |0>: expected 0, actual 0.7071067811865475',
        '  - |1>: expected 1, actual 0.7071067811865475',
        ''
      ].join('\n'));
      assert.deepStrictEqual(output.jsonOutput, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni',
        status: 'failed',
        exitCode: 1,
        checks: [{ type: 'run', status: 'failed' }]
      });
    });
  });

  it('grades a benchmark suite without writing CLI output', async () => {
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
        total: 10,
        passed: 10,
        failed: 0,
        disallowed: 0,
        error: 0
      });
    });
  });

  it('formats suite command output in the benchmark adapter layer', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkSuite({
        benchmarkDir: 'benchmarks/quantum-katas',
        solutionsDir: 'benchmarks/solutions/quantum-katas'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));
      const output = benchmarkSuiteCommandReport(captured.value);

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.equal(output.exitCode, 0);
      assert.equal(output.humanOutput, [
        'PASS benchmark suite',
        'tasks: 10',
        'passed: 10, failed: 0, disallowed: 0, error: 0',
        '- passed basic-gates/basis-change BasisChange',
        '- passed basic-gates/global-phase-change GlobalPhaseChange',
        '- passed basic-gates/state-flip StateFlip',
        '- passed superposition/all-basis-vector-with-phase-flip-two-qubits AllBasisVectorWithPhaseFlip_TwoQubits',
        '- passed superposition/all-basis-vectors-two-qubits AllBasisVectors_TwoQubits',
        '- passed superposition/all-basis-vectors-with-phases-two-qubits AllBasisVectorsWithPhases_TwoQubits',
        '- passed superposition/bell-state BellState',
        '- passed superposition/ghz-state GHZState',
        '- passed superposition/minus-state MinusState',
        '- passed superposition/plus-state PlusState',
        ''
      ].join('\n'));
      assert.equal(output.jsonOutput.status, 'passed');
      assert.deepStrictEqual(output.jsonOutput.summary, {
        total: 10,
        passed: 10,
        failed: 0,
        disallowed: 0,
        error: 0
      });
    });
  });

  it('aggregates suite failures through the evaluation runner seam', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'benchmarks', 'basic-gates'), { recursive: true });
      await mkdir(path.join(dir, 'solutions', 'basic-gates'), { recursive: true });
      await writeFile(path.join(dir, 'benchmarks', 'basic-gates', 'state-flip.md'), [
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
      await writeFile(path.join(dir, 'solutions', 'basic-gates', 'state-flip.qni'), 'qni add H --qubit 0 --step 0\n');

      const captured = captureProcessWrites(() => gradeBenchmarkSuite({
        benchmarkDir: 'benchmarks',
        solutionsDir: 'solutions'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.equal(captured.value.status, 'failed');
      assert.equal(captured.value.exitCode, 1);
      assert.deepStrictEqual(captured.value.summary, {
        total: 1,
        passed: 0,
        failed: 1,
        disallowed: 0,
        error: 0
      });
      assert.deepStrictEqual(captured.value.results.map((result) => result.status), ['failed']);
    });
  });

  it('classifies disallowed submissions without writing CLI output', async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: 'benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni'
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: 'benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni',
        status: 'disallowed',
        exitCode: 2,
        checks: []
      });
    });
  });

  it('classifies .qni lines that do not start with qni as error results', async () => {
    await withTempDir(async (dir) => {
      const submissionPath = path.join(dir, 'submission.qni');
      await writeFile(submissionPath, 'echo not-qni\n');

      const captured = captureProcessWrites(() => gradeBenchmarkTask({
        taskFile: 'benchmarks/quantum-katas/basic-gates/state-flip.md',
        submissionFile: submissionPath
      }, {
        cwd: dir,
        env: { PATH: '' },
        projectRoot: process.cwd()
      }));

      assert.equal(captured.stdout, '');
      assert.equal(captured.stderr, '');
      assert.deepStrictEqual(captured.value, {
        taskId: 'basic-gates/state-flip',
        title: 'StateFlip',
        submission: submissionPath,
        status: 'error',
        exitCode: 3,
        checks: [],
        error: 'submission command must start with qni at line 1: echo not-qni'
      });
    });
  });
});
