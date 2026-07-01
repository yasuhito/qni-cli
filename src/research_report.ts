import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import path = require('node:path');

import type { BenchmarkStatus, BenchmarkSuiteSummary } from './evaluation_runner';

export interface ReadResearchTrialsOptions {
  readonly cwd: string;
}

export interface ResearchReport {
  readonly schemaVersion: 1;
  readonly taskSummary: BenchmarkSuiteSummary;
  readonly trials: readonly ResearchReportTrial[];
  readonly trialSummary: ResearchReportTrialSummary;
}

export type ResearchReportTrial = ResearchReportValidTrial | ResearchReportInvalidTrial;

export interface ResearchReportValidTrial {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly createdAt: string;
  readonly id: string;
  readonly path: string;
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

export interface ResearchReportInvalidTrial {
  readonly benchmark: null;
  readonly collaborator: null;
  readonly createdAt: null;
  readonly id: string;
  readonly invalidReason: readonly string[];
  readonly path: string;
  readonly status: 'invalid';
  readonly summary: BenchmarkSuiteSummary;
}

export interface ResearchReportTrialSummary {
  readonly disallowed: number;
  readonly error: number;
  readonly failed: number;
  readonly invalid: number;
  readonly passed: number;
  readonly total: number;
}

export type ResearchTrial = ValidResearchTrial | InvalidResearchTrial;

export interface ValidResearchTrial {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly createdAt: string;
  readonly id: string;
  readonly kind: 'valid';
  readonly path: string;
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

export interface InvalidResearchTrial {
  readonly id: string;
  readonly invalidReason: string[];
  readonly kind: 'invalid';
  readonly path: string;
  readonly status: 'invalid';
}

interface ResearchTrialMetadata {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly createdAt: string;
  readonly id: string;
  readonly result: string;
  readonly status: BenchmarkStatus;
}

interface ResearchTrialResult {
  readonly resultsLength: number;
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

interface JsonObjectReadResult {
  readonly invalidReason: string[];
  readonly value?: Record<string, unknown>;
}

interface ResearchReportHumanSummary {
  readonly disallowed: number;
  readonly error: number;
  readonly failed: number;
  readonly invalid?: number;
  readonly passed: number;
  readonly total: number;
}

const RESEARCH_RUNS_DISPLAY_PATH = 'research/runs';
const RESEARCH_RUNS_PATH = path.join('research', 'runs');
const RESEARCH_TRIAL_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{6}Z)/u;
const RESEARCH_TRIAL_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function buildResearchReport(trials: readonly ResearchTrial[]): ResearchReport {
  const trialSummary = emptyResearchReportTrialSummary();
  const taskSummary = emptyBenchmarkSuiteSummary();

  for (const trial of trials) {
    addTrialStatus(trialSummary, trial.status);

    if (trial.kind === 'valid') {
      addBenchmarkSuiteSummary(taskSummary, trial.summary);
    }
  }

  return {
    schemaVersion: 1,
    trialSummary,
    taskSummary,
    trials: trials.map((trial) => researchReportTrial(trial))
  };
}

export function formatResearchReportHumanOutput(report: ResearchReport): string {
  const lines = [
    'Research trial report',
    `Research runs: ${RESEARCH_RUNS_DISPLAY_PATH}`,
    '',
    'Trial summary:',
    ...summaryLines(report.trialSummary, ['total', 'passed', 'failed', 'disallowed', 'error', 'invalid']),
    '',
    'Task summary:',
    ...summaryLines(report.taskSummary, ['total', 'passed', 'failed', 'disallowed', 'error'])
  ];

  if (report.trials.length === 0) {
    lines.push('', 'No research trials found.');
    return outputLines(lines);
  }

  lines.push('', 'Trials:', `  ${'status'.padEnd(13)}${'tasks'.padEnd(7)}id`);
  for (const trial of report.trials) {
    lines.push(...researchReportTrialHumanLines(trial));
  }

  const invalidTrials = report.trials.filter((trial): trial is ResearchReportInvalidTrial => trial.status === 'invalid');

  if (invalidTrials.length > 0) {
    lines.push('', 'Invalid details:');
    for (const trial of invalidTrials) {
      lines.push(`  ${trial.id}`, ...trial.invalidReason.map((reason) => `    - ${reason}`));
    }
  }

  return outputLines(lines);
}

export function readResearchTrials(options: ReadResearchTrialsOptions): ResearchTrial[] {
  return readResearchTrialsFromRunsDir(options, { strict: false });
}

export function readResearchTrialsForReport(options: ReadResearchTrialsOptions): ResearchTrial[] {
  return readResearchTrialsFromRunsDir(options, { strict: true });
}

function readResearchTrialsFromRunsDir(
  options: ReadResearchTrialsOptions,
  readOptions: { readonly strict: boolean }
): ResearchTrial[] {
  const runsDir = path.join(options.cwd, RESEARCH_RUNS_PATH);
  let entries: Dirent[];
  let runsDirStats: ReturnType<typeof statSync>;

  try {
    runsDirStats = statSync(runsDir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    if (readOptions.strict) {
      throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
    }

    return [];
  }

  if (!runsDirStats.isDirectory()) {
    if (readOptions.strict) {
      throw new Error(`Research runs path is not a directory: ${RESEARCH_RUNS_DISPLAY_PATH}`);
    }

    return [];
  }

  try {
    entries = readdirSync(runsDir, { withFileTypes: true });
  } catch {
    if (readOptions.strict) {
      throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
    }

    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => readResearchTrial(options.cwd, path.join(runsDir, entry.name), entry.name))
    .sort(compareResearchTrials);
}

function emptyResearchReportTrialSummary(): {
  disallowed: number;
  error: number;
  failed: number;
  invalid: number;
  passed: number;
  total: number;
} {
  return {
    passed: 0,
    failed: 0,
    disallowed: 0,
    error: 0,
    invalid: 0,
    total: 0
  };
}

function emptyBenchmarkSuiteSummary(): {
  disallowed: number;
  error: number;
  failed: number;
  passed: number;
  total: number;
} {
  return {
    passed: 0,
    failed: 0,
    disallowed: 0,
    error: 0,
    total: 0
  };
}

function addTrialStatus(summary: {
  disallowed: number;
  error: number;
  failed: number;
  invalid: number;
  passed: number;
  total: number;
}, status: BenchmarkStatus | 'invalid'): void {
  summary[status] += 1;
  summary.total += 1;
}

function addBenchmarkSuiteSummary(
  target: {
    disallowed: number;
    error: number;
    failed: number;
    passed: number;
    total: number;
  },
  source: BenchmarkSuiteSummary
): void {
  target.passed += source.passed;
  target.failed += source.failed;
  target.disallowed += source.disallowed;
  target.error += source.error;
  target.total += source.total;
}

function researchReportTrial(trial: ResearchTrial): ResearchReportTrial {
  if (trial.kind === 'invalid') {
    return {
      id: trial.id,
      createdAt: null,
      collaborator: null,
      benchmark: null,
      status: 'invalid',
      summary: emptyBenchmarkSuiteSummary(),
      path: trial.path,
      invalidReason: trial.invalidReason
    };
  }

  return {
    id: trial.id,
    createdAt: trial.createdAt,
    collaborator: trial.collaborator,
    benchmark: trial.benchmark,
    status: trial.status,
    summary: {
      passed: trial.summary.passed,
      failed: trial.summary.failed,
      disallowed: trial.summary.disallowed,
      error: trial.summary.error,
      total: trial.summary.total
    },
    path: trial.path
  };
}

function summaryLines(
  summary: ResearchReportHumanSummary,
  keys: readonly (keyof ResearchReportHumanSummary & string)[]
): string[] {
  return keys.map((key) => `  ${key}: ${summary[key] ?? 0}`);
}

function researchReportTrialHumanLines(trial: ResearchReportTrial): string[] {
  if (trial.status === 'invalid') {
    return [
      `  ${trial.status.padEnd(13)}${'-'.padEnd(7)}${trial.id}`,
      `    path: ${trial.path}`
    ];
  }

  return [
    `  ${trial.status.padEnd(13)}${`${trial.summary.passed}/${trial.summary.total}`.padEnd(7)}${trial.id}`,
    `    collaborator: ${trial.collaborator}`,
    `    benchmark: ${trial.benchmark}`,
    `    path: ${trial.path}`
  ];
}

function readResearchTrial(cwd: string, trialDir: string, id: string): ResearchTrial {
  const invalidReason = invalidReasonsForTrialId(id);
  const metadataFile = readJsonObject(path.join(trialDir, 'metadata.json'), 'metadata.json');
  const resultFile = readJsonObject(path.join(trialDir, 'result.json'), 'result.json');

  invalidReason.push(...metadataFile.invalidReason, ...resultFile.invalidReason);

  const metadata = metadataFile.value ? researchTrialMetadata(metadataFile.value, invalidReason) : undefined;
  const result = resultFile.value ? researchTrialResult(resultFile.value, invalidReason) : undefined;

  if (metadata && metadata.id !== id) {
    invalidReason.push(`metadata id ${metadata.id} does not match research trial id ${id}`);
  }

  if (metadata && metadata.result !== 'result.json') {
    invalidReason.push(`metadata result ${metadata.result} does not point to result.json`);
  }

  if (metadata && result && metadata.status !== result.status) {
    invalidReason.push(`metadata status ${metadata.status} does not match result status ${result.status}`);
  }

  if (result && result.summary.total !== result.resultsLength) {
    invalidReason.push(`result summary total ${result.summary.total} does not match results length ${result.resultsLength}`);
  }

  if (!metadata || !result || invalidReason.length > 0) {
    return invalidResearchTrial(cwd, trialDir, id, invalidReason);
  }

  return {
    kind: 'valid',
    id,
    createdAt: metadata.createdAt,
    collaborator: metadata.collaborator,
    benchmark: metadata.benchmark,
    status: metadata.status,
    summary: result.summary,
    path: toPosixPath(path.relative(cwd, trialDir))
  };
}

function readJsonObject(filePath: string, displayName: string): JsonObjectReadResult {
  if (!existsSync(filePath)) {
    return { invalidReason: [`${displayName} is missing`] };
  }

  let contents: string;

  try {
    contents = readFileSync(filePath, 'utf8');
  } catch {
    return { invalidReason: [`${displayName} could not be read`] };
  }

  let value: unknown;

  try {
    value = JSON.parse(contents) as unknown;
  } catch {
    return { invalidReason: [`${displayName} is not valid JSON`] };
  }

  if (!isRecord(value)) {
    return { invalidReason: [`${displayName} must be a JSON object`] };
  }

  return {
    invalidReason: [],
    value
  };
}

function researchTrialMetadata(
  value: Record<string, unknown>,
  invalidReason: string[]
): ResearchTrialMetadata | undefined {
  if (value.schemaVersion !== 1) {
    invalidReason.push(`unsupported metadata schemaVersion: ${String(value.schemaVersion)}`);
    return undefined;
  }

  const id = requiredString(value, 'id', 'metadata.json', invalidReason);
  const createdAt = requiredString(value, 'createdAt', 'metadata.json', invalidReason);
  const collaborator = requiredString(value, 'collaborator', 'metadata.json', invalidReason);
  const benchmark = requiredString(value, 'benchmark', 'metadata.json', invalidReason);
  const result = requiredString(value, 'result', 'metadata.json', invalidReason);
  const status = requiredBenchmarkStatus(value.status, 'metadata.json status', invalidReason);

  if (!id || !createdAt || !collaborator || !benchmark || !result || !status) {
    return undefined;
  }

  return {
    id,
    createdAt,
    collaborator,
    benchmark,
    result,
    status
  };
}

function researchTrialResult(
  value: Record<string, unknown>,
  invalidReason: string[]
): ResearchTrialResult | undefined {
  const status = requiredBenchmarkStatus(value.status, 'result.json status', invalidReason);
  const summary = benchmarkSuiteSummary(value.summary, invalidReason);
  const resultsLength = resultsArrayLength(value.results, invalidReason);

  if (!status || !summary || resultsLength === undefined) {
    return undefined;
  }

  return {
    status,
    summary,
    resultsLength
  };
}

function benchmarkSuiteSummary(value: unknown, invalidReason: string[]): BenchmarkSuiteSummary | undefined {
  if (!isRecord(value)) {
    invalidReason.push('result summary must be a JSON object');
    return undefined;
  }

  const total = requiredInteger(value, 'total', 'result summary', invalidReason);
  const passed = requiredInteger(value, 'passed', 'result summary', invalidReason);
  const failed = requiredInteger(value, 'failed', 'result summary', invalidReason);
  const disallowed = requiredInteger(value, 'disallowed', 'result summary', invalidReason);
  const error = requiredInteger(value, 'error', 'result summary', invalidReason);

  if (
    total === undefined ||
    passed === undefined ||
    failed === undefined ||
    disallowed === undefined ||
    error === undefined
  ) {
    return undefined;
  }

  return {
    total,
    passed,
    failed,
    disallowed,
    error
  };
}

function resultsArrayLength(value: unknown, invalidReason: string[]): number | undefined {
  if (!Array.isArray(value)) {
    invalidReason.push('result results must be an array');
    return undefined;
  }

  return value.length;
}

function requiredString(
  value: Record<string, unknown>,
  fieldName: string,
  sourceName: string,
  invalidReason: string[]
): string | undefined {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.length === 0) {
    invalidReason.push(`${sourceName} ${fieldName} must be a non-empty string`);
    return undefined;
  }

  return fieldValue;
}

function requiredInteger(
  value: Record<string, unknown>,
  fieldName: string,
  sourceName: string,
  invalidReason: string[]
): number | undefined {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'number' || !Number.isInteger(fieldValue)) {
    invalidReason.push(`${sourceName} ${fieldName} must be an integer`);
    return undefined;
  }

  return fieldValue;
}

function requiredBenchmarkStatus(
  value: unknown,
  sourceName: string,
  invalidReason: string[]
): BenchmarkStatus | undefined {
  if (isBenchmarkStatus(value)) {
    return value;
  }

  invalidReason.push(`${sourceName} must be passed, failed, disallowed, or error`);
  return undefined;
}

function isBenchmarkStatus(value: unknown): value is BenchmarkStatus {
  return value === 'passed' || value === 'failed' || value === 'disallowed' || value === 'error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingPathError(error: unknown): boolean {
  return isErrnoException(error) && error.code === 'ENOENT';
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function invalidReasonsForTrialId(id: string): string[] {
  return RESEARCH_TRIAL_ID_PATTERN.test(id) ? [] : [`invalid research trial id: ${id}`];
}

function invalidResearchTrial(cwd: string, trialDir: string, id: string, invalidReason: string[]): InvalidResearchTrial {
  return {
    kind: 'invalid',
    id,
    status: 'invalid',
    invalidReason,
    path: toPosixPath(path.relative(cwd, trialDir))
  };
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function compareResearchTrials(left: ResearchTrial, right: ResearchTrial): number {
  const timestampOrder = timestampPart(right.id).localeCompare(timestampPart(left.id));

  return timestampOrder === 0 ? left.id.localeCompare(right.id) : timestampOrder;
}

function timestampPart(id: string): string {
  return RESEARCH_TRIAL_TIMESTAMP_PATTERN.exec(id)?.[1] ?? '';
}

function outputLines(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}
