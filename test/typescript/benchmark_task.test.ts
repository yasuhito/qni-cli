import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { loadBenchmarkTask, type BenchmarkTask } from '../../src/evaluation_runner/benchmark_task';
import { withTempDir } from './helpers/command';

describe('benchmark task frontmatter parser', () => {
  it('keeps the explicit grading cases marker optional on the exported task type', () => {
    const task: BenchmarkTask = {
      allowedCommands: [{ argv: ['add'], source: 'qni add' }],
      availableGates: ['X(target)'],
      checks: {
        tolerance: 1e-9,
        items: []
      },
      gradingCases: [],
      id: 'compat/manual-task',
      title: 'ManualTask'
    };

    assert.equal(task.hasExplicitGradingCases, undefined);
  });

  it('parses neutral available gates', async () => {
    await withTempDir(async (dir) => {
      const taskPath = path.join(dir, 'task.md');

      await writeTask(taskPath, [
        'id: basic-gates/state-flip',
        'title: StateFlip',
        'source: test',
        'difficulty: smoke',
        'available_gates:',
        '  - X(target)',
        '  - CNOT(control, target)',
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
        '            imaginary: 0'
      ]);

      const task = loadBenchmarkTask(taskPath);

      assert.deepStrictEqual(task.availableGates, ['X(target)', 'CNOT(control, target)']);
    });
  });

  it('normalizes root checks into an implicit grading case', async () => {
    await withTempDir(async (dir) => {
      const taskPath = path.join(dir, 'task.md');

      await writeTask(taskPath, [
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
        '            imaginary: 0'
      ]);

      const task = loadBenchmarkTask(taskPath);

      assert.deepStrictEqual(task.gradingCases, [
        {
          id: 'default',
          setupCommands: [],
          checks: {
            tolerance: 1e-9,
            items: [
              {
                type: 'run',
                expected: [
                  {
                    basis: '|1>',
                    amplitude: {
                      real: 1,
                      imaginary: 0
                    }
                  }
                ]
              }
            ]
          }
        }
      ]);
      assert.strictEqual(task.checks, task.gradingCases[0]?.checks);
    });
  });

  it('parses explicit grading cases with qni setup commands', async () => {
    await withTempDir(async (dir) => {
      const taskPath = path.join(dir, 'task.md');

      await writeTask(taskPath, [
        'id: grading-cases/state-preparation',
        'title: StatePreparationCases',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'grading_cases:',
        '  - id: starts-at-one',
        '    setup_commands:',
        '      - qni state set "1|1>"',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: run',
        '          expected:',
        '            - basis: "|1>"',
        '              amplitude:',
        '                real: 1',
        '                imaginary: 0',
        '  - id: starts-at-zero',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: expect',
        '          expected:',
        '            - pauli: z',
        '              value: 1'
      ]);

      const task = loadBenchmarkTask(taskPath);

      assert.deepStrictEqual(task.gradingCases, [
        {
          id: 'starts-at-one',
          setupCommands: [
            {
              argv: ['state', 'set', '1|1>'],
              source: 'qni state set 1|1>'
            }
          ],
          checks: {
            tolerance: 1e-9,
            items: [
              {
                type: 'run',
                expected: [
                  {
                    basis: '|1>',
                    amplitude: {
                      real: 1,
                      imaginary: 0
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          id: 'starts-at-zero',
          setupCommands: [],
          checks: {
            tolerance: 1e-9,
            items: [
              {
                type: 'expect',
                expected: [
                  {
                    pauli: 'Z',
                    value: 1
                  }
                ]
              }
            ]
          }
        }
      ]);
      assert.strictEqual(task.checks, task.gradingCases[0]?.checks);
    });
  });

  it('uses the default grading case for legacy checks compatibility', async () => {
    await withTempDir(async (dir) => {
      const taskPath = path.join(dir, 'task.md');

      await writeTask(taskPath, [
        'id: grading-cases/default-compatibility',
        'title: DefaultCompatibility',
        'source: test',
        'difficulty: smoke',
        'allowed_commands:',
        '  - qni add',
        'grading_cases:',
        '  - id: starts-at-one',
        '    checks:',
        '      tolerance: 1e-6',
        '      items:',
        '        - type: expect',
        '          expected:',
        '            - pauli: Z',
        '              value: -1',
        '  - id: default',
        '    checks:',
        '      tolerance: 1e-9',
        '      items:',
        '        - type: expect',
        '          expected:',
        '            - pauli: Z',
        '              value: 1'
      ]);

      const task = loadBenchmarkTask(taskPath);
      const defaultCase = task.gradingCases.find((gradingCase) => gradingCase.id === 'default');

      assert.deepStrictEqual(task.gradingCases.map((gradingCase) => gradingCase.id), ['starts-at-one', 'default']);
      assert.ok(defaultCase);
      assert.strictEqual(task.checks, defaultCase.checks);
    });
  });

  it('rejects missing available gates', async () => {
    await assertInvalidTask([
      'id: neutral-gates/missing',
      'title: MissingAvailableGates',
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
      '            imaginary: 0'
    ], /available_gates is required/u, { includeDefaultAvailableGates: false });
  });

  it('rejects empty available gates', async () => {
    await assertInvalidTask([
      'id: neutral-gates/empty',
      'title: EmptyAvailableGates',
      'source: test',
      'difficulty: smoke',
      'available_gates: []',
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
      '            imaginary: 0'
    ], /available_gates must list at least one gate/u);
  });

  it('rejects available gates that are not a list', async () => {
    await assertInvalidTask([
      'id: neutral-gates/not-a-list',
      'title: AvailableGatesNotAList',
      'source: test',
      'difficulty: smoke',
      'available_gates: X(target)',
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
      '            imaginary: 0'
    ], /available_gates must list at least one gate/u);
  });

  it('rejects available gates entries that are not strings', async () => {
    await assertInvalidTask([
      'id: neutral-gates/non-string',
      'title: NonStringAvailableGates',
      'source: test',
      'difficulty: smoke',
      'available_gates:',
      '  - X(target)',
      '  - 42',
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
      '            imaginary: 0'
    ], /available_gates entries must be strings/u);
  });

  it('rejects empty available gates entries', async () => {
    await assertInvalidTask([
      'id: neutral-gates/empty-entry',
      'title: EmptyAvailableGatesEntry',
      'source: test',
      'difficulty: smoke',
      'available_gates:',
      '  - ""',
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
      '            imaginary: 0'
    ], /available_gates entries must not be empty/u);
  });

  it('rejects root checks and explicit grading cases together', async () => {
    await assertInvalidTask([
      'id: grading-cases/conflict',
      'title: GradingCasesConflict',
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
      'grading_cases:',
      '  - id: default',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: Z',
      '              value: 1'
    ], /checks and grading_cases must not both be specified/u);
  });

  it('rejects empty grading cases', async () => {
    await assertInvalidTask([
      'id: grading-cases/empty',
      'title: EmptyGradingCases',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases: []'
    ], /grading_cases must list at least one case/u);
  });

  it('rejects grading_cases that is not a list', async () => {
    await assertInvalidTask([
      'id: grading-cases/not-a-list',
      'title: GradingCasesNotAList',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases:',
      '  id: default'
    ], /grading_cases must list at least one case/u);
  });

  it('rejects duplicate grading case ids', async () => {
    await assertInvalidTask([
      'id: grading-cases/duplicate',
      'title: DuplicateGradingCaseIds',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases:',
      '  - id: same',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: Z',
      '              value: 1',
      '  - id: same',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: X',
      '              value: 0'
    ], /duplicate grading_cases id: same/u);
  });

  it('rejects empty grading case ids', async () => {
    await assertInvalidTask([
      'id: grading-cases/empty-id',
      'title: EmptyGradingCaseId',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases:',
      '  - id: ""',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: Z',
      '              value: 1'
    ], /grading_cases id must not be empty/u);
  });

  it('rejects setup commands that do not start with qni', async () => {
    await assertInvalidTask([
      'id: grading-cases/shell-setup',
      'title: ShellSetup',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases:',
      '  - id: shell-setup',
      '    setup_commands:',
      '      - echo not-qni',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: Z',
      '              value: 1'
    ], /setup_commands entries must start with a qni subcommand: echo not-qni/u);
  });

  it('rejects setup commands without a qni subcommand', async () => {
    await assertInvalidTask([
      'id: grading-cases/missing-setup-subcommand',
      'title: MissingSetupSubcommand',
      'source: test',
      'difficulty: smoke',
      'allowed_commands:',
      '  - qni add',
      'grading_cases:',
      '  - id: missing-setup-subcommand',
      '    setup_commands:',
      '      - qni',
      '    checks:',
      '      tolerance: 1e-9',
      '      items:',
      '        - type: expect',
      '          expected:',
      '            - pauli: Z',
      '              value: 1'
    ], /setup_commands entries must start with a qni subcommand: qni/u);
  });
});

interface WriteTaskOptions {
  readonly includeDefaultAvailableGates?: boolean;
}

async function assertInvalidTask(
  frontmatterLines: readonly string[],
  errorPattern: RegExp,
  options: WriteTaskOptions = {}
): Promise<void> {
  await withTempDir(async (dir) => {
    const taskPath = path.join(dir, 'task.md');

    await writeTask(taskPath, frontmatterLines, options);

    assert.throws(() => loadBenchmarkTask(taskPath), errorPattern);
  });
}

async function writeTask(
  taskPath: string,
  frontmatterLines: readonly string[],
  options: WriteTaskOptions = {}
): Promise<void> {
  await writeFile(taskPath, [
    '---',
    ...withDefaultAvailableGates(frontmatterLines, options),
    '---',
    '',
    'Grade the submission.'
  ].join('\n'));
}

function withDefaultAvailableGates(
  frontmatterLines: readonly string[],
  options: WriteTaskOptions
): readonly string[] {
  const includeDefault = options.includeDefaultAvailableGates ?? true;

  if (!includeDefault || frontmatterLines.some((line) => line.trim().startsWith('available_gates:'))) {
    return frontmatterLines;
  }

  const difficultyIndex = frontmatterLines.findIndex((line) => line.trim().startsWith('difficulty:'));
  const insertIndex = difficultyIndex === -1 ? frontmatterLines.length : difficultyIndex + 1;

  return [
    ...frontmatterLines.slice(0, insertIndex),
    'available_gates:',
    '  - X(target)',
    ...frontmatterLines.slice(insertIndex)
  ];
}
