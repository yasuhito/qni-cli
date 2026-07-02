import { existsSync, readFileSync } from 'node:fs';
import path = require('node:path');

import { parseDocument } from 'yaml';

import type { CommandHandlerContext } from './dispatcher';

export interface ResearchModelRegistration {
  readonly apiKeyEnv: string;
  readonly apiModel: string;
  readonly baseUrl: string;
  readonly inputCostPerMillionTokensUsd: number;
  readonly outputCostPerMillionTokensUsd: number;
  readonly provider: 'openai-compatible';
  readonly registryId: string;
}

type ModelRegistryRecord = Readonly<Record<string, unknown>>;

class ResearchModelRegistryError extends Error {}

const MODEL_REGISTRY_PATH = path.join('research', 'models.yaml');

export function loadResearchModelRegistration(options: {
  readonly context: CommandHandlerContext;
  readonly modelId: string;
}): ResearchModelRegistration {
  const registryPath = resolveModelRegistryPath(options.context);
  const registry = parseModelRegistry(readFileSync(registryPath, 'utf8'));
  const model = registry[options.modelId];

  if (!isRecord(model)) {
    throw new ResearchModelRegistryError(`Model is not registered in research/models.yaml: ${options.modelId}`);
  }

  return parseModelRegistration(options.modelId, model);
}

export function resolveModelApiKey(model: ResearchModelRegistration, env: NodeJS.ProcessEnv): string {
  const value = env[model.apiKeyEnv];

  if (value === undefined || value.trim().length === 0) {
    throw new ResearchModelRegistryError(`API key environment variable is not set: ${model.apiKeyEnv}`);
  }

  return value;
}

function resolveModelRegistryPath(context: CommandHandlerContext): string {
  const cwdPath = path.resolve(context.cwd, MODEL_REGISTRY_PATH);

  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  const projectPath = path.resolve(context.projectRoot, MODEL_REGISTRY_PATH);

  if (existsSync(projectPath)) {
    return projectPath;
  }

  throw new ResearchModelRegistryError(`Model registry file does not exist: ${MODEL_REGISTRY_PATH}`);
}

function parseModelRegistry(yamlText: string): Readonly<Record<string, unknown>> {
  const document = parseDocument(yamlText);
  const firstError = document.errors[0];

  if (firstError) {
    throw new ResearchModelRegistryError(`invalid research/models.yaml: ${firstError.message.split(/\r?\n/u)[0] ?? firstError.message}`);
  }

  const value = document.toJS() as unknown;
  const root = requiredRecord(value, 'research/models.yaml must be a mapping');
  const models = requiredRecord(root.models, 'research/models.yaml must contain a models mapping');

  return models;
}

function parseModelRegistration(registryId: string, value: ModelRegistryRecord): ResearchModelRegistration {
  const provider = requiredString(value.provider, `models.${registryId}.provider must be a string`);

  if (provider !== 'openai-compatible') {
    throw new ResearchModelRegistryError(`unsupported provider for ${registryId}: ${provider}`);
  }

  return {
    registryId,
    provider,
    apiModel: requiredString(value.api_model, `models.${registryId}.api_model must be a string`),
    baseUrl: requiredString(value.base_url, `models.${registryId}.base_url must be a string`),
    apiKeyEnv: requiredString(value.api_key_env, `models.${registryId}.api_key_env must be a string`),
    inputCostPerMillionTokensUsd: requiredNumber(
      value.input_cost_per_million_tokens_usd,
      `models.${registryId}.input_cost_per_million_tokens_usd must be a non-negative number`
    ),
    outputCostPerMillionTokensUsd: requiredNumber(
      value.output_cost_per_million_tokens_usd,
      `models.${registryId}.output_cost_per_million_tokens_usd must be a non-negative number`
    )
  };
}

function requiredRecord(value: unknown, message: string): ModelRegistryRecord {
  if (!isRecord(value)) {
    throw new ResearchModelRegistryError(message);
  }

  return value;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ResearchModelRegistryError(message);
  }

  return value;
}

function requiredNumber(value: unknown, message: string): number {
  const parsed = typeof value === 'number' ? value : Number(String(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ResearchModelRegistryError(message);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
