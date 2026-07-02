import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { loadResearchModelRegistration } from '../../src/research_models';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-research-models-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function writeModelRegistry(dir: string, overrides: {
  readonly inputCostPerMillionTokensUsd?: number;
  readonly outputCostPerMillionTokensUsd?: number;
} = {}): Promise<void> {
  const inputCost = overrides.inputCostPerMillionTokensUsd ?? 1;
  const outputCost = overrides.outputCostPerMillionTokensUsd ?? 2;
  const registryPath = path.join(dir, 'research', 'models.yaml');

  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, [
    'models:',
    '  fake-qni:',
    '    provider: openai-compatible',
    '    api_model: fake-qni-api',
    '    base_url: http://127.0.0.1:9999/v1',
    '    api_key_env: QNI_FAKE_OPENAI_API_KEY',
    `    input_cost_per_million_tokens_usd: ${inputCost}`,
    `    output_cost_per_million_tokens_usd: ${outputCost}`,
    ''
  ].join('\n'));
}

describe('research model registry', () => {
  it('loads non-negative token costs', async () => {
    await withTempDir(async (dir) => {
      await writeModelRegistry(dir, {
        inputCostPerMillionTokensUsd: 0,
        outputCostPerMillionTokensUsd: 0
      });

      const model = loadResearchModelRegistration({
        context: { cwd: dir, env: {}, projectRoot: dir },
        modelId: 'fake-qni'
      });

      assert.equal(model.inputCostPerMillionTokensUsd, 0);
      assert.equal(model.outputCostPerMillionTokensUsd, 0);
    });
  });

  it('rejects negative token costs before cost calculation', async () => {
    await withTempDir(async (dir) => {
      await writeModelRegistry(dir, { inputCostPerMillionTokensUsd: -1 });

      assert.throws(
        () => loadResearchModelRegistration({
          context: { cwd: dir, env: {}, projectRoot: dir },
          modelId: 'fake-qni'
        }),
        /models\.fake-qni\.input_cost_per_million_tokens_usd must be a non-negative number/u
      );
    });
  });

  it('rejects negative output token costs before cost calculation', async () => {
    await withTempDir(async (dir) => {
      await writeModelRegistry(dir, { outputCostPerMillionTokensUsd: -1 });

      assert.throws(
        () => loadResearchModelRegistration({
          context: { cwd: dir, env: {}, projectRoot: dir },
          modelId: 'fake-qni'
        }),
        /models\.fake-qni\.output_cost_per_million_tokens_usd must be a non-negative number/u
      );
    });
  });
});
