import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path = require('node:path');

import type { BenchmarkSuiteGradingResult } from './evaluation_runner';

export interface ResearchTrialInputPaths {
  readonly circuitJson?: string;
  readonly prompt: string;
  readonly response: string;
  readonly submissions: string;
}

export interface ResearchTrialExtraInputPaths {
  readonly calls?: string;
  readonly circuitJson?: string;
  readonly prompts?: string;
  readonly responses?: string;
}

export interface ResearchTrialSummaryExtras {
  readonly cost?: {
    readonly perProblemUsd: number | null;
    readonly totalUsd: number;
  };
  readonly model?: string;
  readonly tokens?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
}

export interface ResearchTrialPlan {
  readonly createdAt: Date;
  readonly destinationConflictHint: string;
  readonly id: string;
  readonly relativePath: string;
  readonly slug: string;
  readonly trialDir: string;
}

export interface ResearchTrialDirectoryWriteRequest {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly extraInputPaths?: ResearchTrialExtraInputPaths;
  readonly inputPaths: ResearchTrialInputPaths;
  readonly metadata?: Record<string, unknown>;
  readonly plan: ResearchTrialPlan;
  readonly result: BenchmarkSuiteGradingResult;
  readonly summary?: ResearchTrialSummaryExtras;
}

interface ResearchTrialScore {
  readonly passed: number;
  readonly percent: number | null;
  readonly source: 'result.json';
  readonly total: number;
}

class ResearchTrialWriterError extends Error {}

const DEFAULT_DESTINATION_CONFLICT_HINT = 'Choose a different research trial slug and try again.';
const RESEARCH_RUNS_PATH = path.join('research', 'runs');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function validateResearchTrialSlug(slug: string): void {
  if (SLUG_PATTERN.test(slug)) {
    return;
  }

  throw new ResearchTrialWriterError([
    `Invalid --slug: ${slug}`,
    'Use lowercase letters, digits, and hyphens between words (pattern: [a-z0-9]+(-[a-z0-9]+)*).'
  ].join('\n'));
}

export function planResearchTrialDirectory(options: {
  readonly cwd: string;
  readonly destinationConflictHint?: string;
  readonly slug: string;
}): ResearchTrialPlan {
  validateResearchTrialSlug(options.slug);
  const createdAt = currentUtcSecond();
  const destinationConflictHint = options.destinationConflictHint ?? DEFAULT_DESTINATION_CONFLICT_HINT;
  const id = `${researchTimestamp(createdAt)}-${options.slug}`;
  const relativePath = toPosixPath(path.join(RESEARCH_RUNS_PATH, id));
  const trialDir = path.join(options.cwd, RESEARCH_RUNS_PATH, id);

  validateResearchTrialDestination({ destinationConflictHint, relativePath, trialDir });

  return {
    createdAt,
    destinationConflictHint,
    id,
    relativePath,
    slug: options.slug,
    trialDir
  };
}

export function writeResearchTrialDirectory(request: ResearchTrialDirectoryWriteRequest): void {
  const parentDir = path.dirname(request.plan.trialDir);
  const stagingPrefix = path.join(parentDir, `${path.basename(request.plan.trialDir)}.tmp-`);

  mkdirSync(parentDir, { recursive: true });
  validateResearchTrialDestination(request.plan);

  const stagingDir = mkdtempSync(stagingPrefix);
  const score = researchTrialScore(request.result);
  let cleanupStaging = true;

  try {
    copyFileSync(request.inputPaths.prompt, path.join(stagingDir, 'prompt.md'));
    copyFileSync(request.inputPaths.response, path.join(stagingDir, 'response.md'));
    cpSync(request.inputPaths.submissions, path.join(stagingDir, 'submissions'), { recursive: true });
    copyOptionalResearchTrialInputDirectory(request.inputPaths.circuitJson, path.join(stagingDir, 'circuit-json'));
    copyExtraResearchTrialInputs(request.extraInputPaths, stagingDir);
    writeJsonFile(path.join(stagingDir, 'result.json'), request.result);
    writeJsonFile(path.join(stagingDir, 'metadata.json'), researchMetadata(request, score));
    writeFileSync(path.join(stagingDir, 'trial.md'), researchTrialSummary(request, score));
    validateResearchTrialDestination(request.plan);
    renameSync(stagingDir, request.plan.trialDir);
    cleanupStaging = false;
  } catch (error) {
    if (cleanupStaging) {
      rmSync(stagingDir, { force: true, recursive: true });
    }
    if (isDestinationConflict(error)) {
      throw researchTrialDestinationError(request.plan);
    }
    throw error;
  }
}

function copyOptionalResearchTrialInputDirectory(inputPath: string | undefined, destination: string): void {
  if (inputPath) {
    cpSync(inputPath, destination, { recursive: true });
  }
}

function copyExtraResearchTrialInputs(inputPaths: ResearchTrialExtraInputPaths | undefined, stagingDir: string): void {
  if (!inputPaths) {
    return;
  }

  if (inputPaths.prompts) {
    cpSync(inputPaths.prompts, path.join(stagingDir, 'prompts'), { recursive: true });
  }
  if (inputPaths.responses) {
    cpSync(inputPaths.responses, path.join(stagingDir, 'responses'), { recursive: true });
  }
  if (inputPaths.circuitJson) {
    cpSync(inputPaths.circuitJson, path.join(stagingDir, 'circuit-json'), { recursive: true });
  }
  if (inputPaths.calls) {
    copyFileSync(inputPaths.calls, path.join(stagingDir, 'calls.json'));
  }
}

function validateResearchTrialDestination(options: {
  readonly destinationConflictHint: string;
  readonly relativePath: string;
  readonly trialDir: string;
}): void {
  if (!existsSync(options.trialDir)) {
    return;
  }

  throw researchTrialDestinationError(options);
}

function researchTrialDestinationError(options: {
  readonly destinationConflictHint: string;
  readonly relativePath: string;
}): ResearchTrialWriterError {
  return new ResearchTrialWriterError([
    `Research trial directory already exists: ${options.relativePath}`,
    options.destinationConflictHint
  ].join('\n'));
}

function isDestinationConflict(error: unknown): boolean {
  const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined;

  return code === 'EEXIST' || code === 'ENOTEMPTY';
}

function currentUtcSecond(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

function researchTimestamp(date: Date): string {
  const iso = date.toISOString();

  return `${iso.slice(0, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function researchMetadata(
  request: ResearchTrialDirectoryWriteRequest,
  score: ResearchTrialScore
): Record<string, unknown> {
  return {
    ...request.metadata,
    schemaVersion: 1,
    id: request.plan.id,
    createdAt: request.plan.createdAt.toISOString(),
    collaborator: request.collaborator,
    benchmark: request.benchmark,
    submissions: 'submissions',
    ...optionalCircuitJsonMetadata(request.inputPaths),
    prompt: 'prompt.md',
    response: 'response.md',
    result: 'result.json',
    status: request.result.status,
    score
  };
}

function optionalCircuitJsonMetadata(inputPaths: ResearchTrialInputPaths): Record<string, string> {
  return inputPaths.circuitJson ? { circuitJson: 'circuit-json' } : {};
}

function researchTrialScore(result: BenchmarkSuiteGradingResult): ResearchTrialScore {
  const { passed, total } = result.summary;

  return {
    passed,
    total,
    percent: total === 0 ? null : (passed / total) * 100,
    source: 'result.json'
  };
}

function researchTrialSummary(request: ResearchTrialDirectoryWriteRequest, score: ResearchTrialScore): string {
  return [
    `# Research trial: ${request.plan.slug}`,
    '',
    `- collaborator: ${request.collaborator}`,
    `- benchmark: ${request.benchmark}`,
    `- status: ${request.result.status}`,
    `- tasks: ${request.result.summary.total}`,
    `- passed: ${request.result.summary.passed}`,
    `- failed: ${request.result.summary.failed}`,
    `- disallowed: ${request.result.summary.disallowed}`,
    `- error: ${request.result.summary.error}`,
    `- score: ${formatScorePercent(score.percent)}`,
    ...researchTrialSummaryExtraLines(request.summary),
    '',
    '## Files',
    '',
    '- Prompt: ./prompt.md',
    '- Response: ./response.md',
    ...researchTrialSummaryExtraFileLines(request.extraInputPaths),
    ...researchTrialSummaryCircuitJsonFileLines(request.inputPaths),
    '- Submissions: ./submissions/',
    '- Result: ./result.json',
    ''
  ].join('\n');
}

function researchTrialSummaryCircuitJsonFileLines(inputPaths: ResearchTrialInputPaths): string[] {
  return inputPaths.circuitJson ? ['- Circuit JSON: ./circuit-json/'] : [];
}

function researchTrialSummaryExtraLines(summary: ResearchTrialSummaryExtras | undefined): string[] {
  if (!summary) {
    return [];
  }

  return [
    ...optionalSummaryLine(summary.model, (model) => `- model: ${model}`),
    ...optionalSummaryLine(summary.tokens, (tokens) => `- tokens: input ${tokens.inputTokens}, output ${tokens.outputTokens}, total ${tokens.totalTokens}`),
    ...optionalSummaryLine(summary.cost, (cost) => `- cost: total ${formatUsd(cost.totalUsd)}, per problem ${formatNullableUsd(cost.perProblemUsd)}`)
  ];
}

function researchTrialSummaryExtraFileLines(inputPaths: ResearchTrialExtraInputPaths | undefined): string[] {
  if (!inputPaths) {
    return [];
  }

  return [
    ...(inputPaths.prompts ? ['- Per-task prompts: ./prompts/'] : []),
    ...(inputPaths.responses ? ['- Per-task responses: ./responses/'] : []),
    ...(inputPaths.circuitJson ? ['- Per-task circuit JSON: ./circuit-json/'] : []),
    ...(inputPaths.calls ? ['- Calls: ./calls.json'] : [])
  ];
}

function optionalSummaryLine<T>(value: T | undefined, format: (value: T) => string): string[] {
  return value === undefined ? [] : [format(value)];
}

function formatScorePercent(percent: number | null): string {
  return percent === null ? 'unknown' : `${percent.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  return `$${value.toPrecision(4)}`;
}

function formatNullableUsd(value: number | null): string {
  return value === null ? 'unknown' : formatUsd(value);
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
