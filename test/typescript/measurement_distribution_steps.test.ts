import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { withTempDir } from './helpers/command';

const cucumberBin = path.join(process.cwd(), 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');

async function malformedSummaryFailure(thenStep: string): Promise<string> {
  return withTempDir(async (dir) => {
    const featurePath = path.join(dir, 'malformed-measurement-summary.feature');
    await writeFile(
      featurePath,
      `Feature: malformed measurement summary\n\nScenario: report the malformed summary\n  Given 標準出力を "malformed" として受け取った\n  Then ${thenStep}\n`
    );

    const result = spawnSync(
      process.execPath,
      [
        cucumberBin,
        '--require',
        'features/support/**/*.js',
        '--require',
        'features/step_definitions/**/*.js',
        '--format',
        'progress',
        featurePath
      ],
      { cwd: process.cwd(), encoding: 'utf8' }
    );

    assert.notEqual(result.status, 0);
    return `${result.stdout}${result.stderr}`;
  });
}

describe('measurement distribution Cucumber steps', () => {
  const cases: readonly [string, RegExp][] = [
    ['標準出力の shots は 3', /unexpected measurement summary: malformed/u],
    ['標準出力の seed は 42', /unexpected measurement summary: malformed/u],
    ['標準出力の seed は符号なし32ビット整数', /unexpected measurement summary: malformed/u],
    [
      '生成したシード値を指定すると通常の標準出力が一致する',
      /unexpected measurement summary: malformed/u
    ],
    ['2回の標準出力は一致する', /expected exactly two repeated command results/u]
  ];

  for (const [thenStep, expectedFailure] of cases) {
    it(`reports missing prerequisites before evaluating: ${thenStep}`, async () => {
      assert.match(await malformedSummaryFailure(thenStep), expectedFailure);
    });
  }
});
