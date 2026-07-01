import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { loadBenchmarkTask } from '../../src/evaluation_runner/benchmark_task';
import { withTempDir } from './helpers/command';

describe('benchmark task frontmatter parser', () => {
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
    ], /setup_commands entries must start with a qni command: echo not-qni/u);
  });
});

async function assertInvalidTask(frontmatterLines: readonly string[], errorPattern: RegExp): Promise<void> {
  await withTempDir(async (dir) => {
    const taskPath = path.join(dir, 'task.md');

    await writeTask(taskPath, frontmatterLines);

    assert.throws(() => loadBenchmarkTask(taskPath), errorPattern);
  });
}

async function writeTask(taskPath: string, frontmatterLines: readonly string[]): Promise<void> {
  await writeFile(taskPath, [
    '---',
    ...frontmatterLines,
    '---',
    '',
    'Grade the submission.'
  ].join('\n'));
}
