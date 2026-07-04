import { readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import path = require('node:path');

import type { BenchmarkStatus, BenchmarkSuiteSummary } from './evaluation_runner';

export interface BuildResearchCompareOptions {
  readonly benchmark: string;
  readonly cwd: string;
}

export interface ResearchCompare {
  readonly benchmark: string;
  readonly differingTasks: readonly ResearchCompareTask[];
  readonly exclusions: ResearchCompareExclusions;
  readonly schemaVersion: 1;
  readonly tasks: readonly ResearchCompareTask[];
  readonly trials: readonly ResearchCompareTrial[];
  readonly warnings: readonly ResearchCompareWarning[];
}

export interface ResearchCompareExclusions {
  readonly benchmarkMismatch: number;
  readonly invalidTrial: number;
  readonly missingOrInvalidResultDetails: number;
}

export interface ResearchCompareTrial {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly createdAt: string;
  readonly id: string;
  readonly path: string;
  readonly score: ResearchCompareScore;
  readonly status: BenchmarkStatus;
  readonly submissionProtocol: string | null;
}

export interface ResearchCompareScore {
  readonly passed: number;
  readonly percent: number | null;
  readonly total: number;
}

export interface ResearchCompareTask {
  readonly differs: boolean;
  readonly results: readonly ResearchCompareTaskResult[];
  readonly statusCounts: ResearchCompareTaskStatusCounts;
  readonly taskId: string;
  readonly title: string | null;
}

export interface ResearchCompareTaskResult {
  readonly status: BenchmarkStatus | 'missing';
  readonly trialId: string;
}

export interface ResearchCompareTaskStatusCounts {
  readonly disallowed: number;
  readonly error: number;
  readonly failed: number;
  readonly missing: number;
  readonly passed: number;
}

export interface ResearchCompareWarning {
  readonly submissionProtocols: readonly string[];
  readonly type: 'mixed-submission-protocols';
}

interface ResearchCompareMetadata {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly createdAt: string;
  readonly id: string;
  readonly result: string;
  readonly status: BenchmarkStatus;
  readonly submissionProtocol: string | null;
}

interface ResearchCompareCandidate {
  readonly id: string;
  readonly metadata?: ResearchCompareMetadata;
  readonly path: string;
  readonly result?: ResearchCompareResultDetails;
}

interface ResearchCompareResultDetails {
  readonly results: readonly TrialTaskResult[];
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

interface TrialTaskResult {
  readonly status: BenchmarkStatus;
  readonly taskId: string;
  readonly title: string | null;
}

interface IncludedTrial {
  readonly details: readonly TrialTaskResult[];
  readonly trial: ResearchCompareTrial;
}

interface JsonObjectReadResult {
  readonly invalidReason: readonly string[];
  readonly value?: Record<string, unknown>;
}

const RESEARCH_RUNS_DISPLAY_PATH = 'research/runs';
const RESEARCH_RUNS_PATH = path.join('research', 'runs');
const RESEARCH_TRIAL_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{6}Z)/u;
const RESEARCH_TRIAL_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STATUS_ORDER: readonly (BenchmarkStatus | 'missing')[] = ['passed', 'failed', 'disallowed', 'error', 'missing'];

export function buildResearchCompare(options: BuildResearchCompareOptions): ResearchCompare {
  let invalidTrial = 0;
  let benchmarkMismatch = 0;
  let missingOrInvalidResultDetails = 0;
  const included: IncludedTrial[] = [];

  for (const candidate of readResearchCompareCandidates(options.cwd)) {
    if (!candidate.metadata) {
      invalidTrial += 1;
      continue;
    }

    if (candidate.metadata.benchmark !== options.benchmark) {
      benchmarkMismatch += 1;
      continue;
    }

    if (!candidate.result) {
      missingOrInvalidResultDetails += 1;
      continue;
    }

    included.push({
      details: candidate.result.results,
      trial: researchCompareTrial(candidate.path, candidate.metadata, candidate.result.summary)
    });
  }

  const tasks = researchCompareTasks(included);

  return {
    schemaVersion: 1,
    benchmark: options.benchmark,
    exclusions: {
      invalidTrial,
      benchmarkMismatch,
      missingOrInvalidResultDetails
    },
    warnings: researchCompareWarnings(included.map((item) => item.trial)),
    trials: included.map((item) => item.trial),
    tasks,
    differingTasks: tasks.filter((task) => task.differs)
  };
}

export function formatResearchCompareHumanOutput(compare: ResearchCompare): string {
  const lines = [
    'Research trial comparison',
    `Research runs: ${RESEARCH_RUNS_DISPLAY_PATH}`,
    `Benchmark: ${compare.benchmark}`,
    '',
    'Included trials:'
  ];

  if (compare.trials.length === 0) {
    lines.push('  No matching research trials found.');
  } else {
    lines.push(`  ${'status'.padEnd(13)}${'score'.padEnd(18)}id`);
    for (const trial of compare.trials) {
      lines.push(`  ${trial.status.padEnd(13)}${formatScore(trial.score).padEnd(18)}${trial.id}`);
      lines.push(`    collaborator: ${trial.collaborator}`);
      lines.push(`    submission protocol: ${trial.submissionProtocol ?? 'unspecified'}`);
      lines.push(`    path: ${trial.path}`);
    }
  }

  lines.push('', 'Task matrix:');
  if (compare.tasks.length === 0 || compare.trials.length === 0) {
    lines.push('  No comparable task results found.');
  } else {
    lines.push(...taskMatrixLines(compare));
  }

  lines.push('', 'Differing tasks:');
  if (compare.differingTasks.length === 0) {
    lines.push('  None');
  } else {
    for (const task of compare.differingTasks) {
      lines.push(`  ${task.taskId} ${task.title ?? '-'}: ${formatStatusCounts(task.statusCounts)}`);
    }
  }

  if (compare.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const warning of compare.warnings) {
      lines.push(`  mixed submission protocols: ${warning.submissionProtocols.join(', ')}`);
    }
  }

  lines.push(
    '',
    'Excluded trials:',
    `  invalid trial: ${compare.exclusions.invalidTrial}`,
    `  benchmark mismatch: ${compare.exclusions.benchmarkMismatch}`,
    `  missing or invalid result details: ${compare.exclusions.missingOrInvalidResultDetails}`
  );

  return `${lines.join('\n')}\n`;
}

function readResearchCompareCandidates(cwd: string): ResearchCompareCandidate[] {
  const runsDir = path.join(cwd, RESEARCH_RUNS_PATH);
  let entries: Dirent[];
  let runsDirStats: ReturnType<typeof statSync>;

  try {
    runsDirStats = statSync(runsDir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  if (!runsDirStats.isDirectory()) {
    throw new Error(`Research runs path is not a directory: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  try {
    entries = readdirSync(runsDir, { withFileTypes: true });
  } catch {
    throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => readResearchCompareCandidate(cwd, path.join(runsDir, entry.name), entry.name))
    .sort(compareResearchCompareCandidates);
}

function readResearchCompareCandidate(cwd: string, trialDir: string, id: string): ResearchCompareCandidate {
  const metadataInvalidReasons = invalidReasonsForTrialId(id);
  const metadataFile = readJsonObject(path.join(trialDir, 'metadata.json'), 'metadata.json');

  metadataInvalidReasons.push(...metadataFile.invalidReason);

  const metadata = metadataFile.value ? researchCompareMetadata(metadataFile.value, metadataInvalidReasons) : undefined;

  if (metadata && metadata.id !== id) {
    metadataInvalidReasons.push(`metadata id ${metadata.id} does not match research trial id ${id}`);
  }

  if (metadata && metadata.result !== 'result.json') {
    metadataInvalidReasons.push(`metadata result ${metadata.result} does not point to result.json`);
  }

  const relativePath = toPosixPath(path.relative(cwd, trialDir));

  if (!metadata || metadataInvalidReasons.length > 0) {
    return {
      id,
      path: relativePath
    };
  }

  return {
    id,
    metadata,
    path: relativePath,
    result: readCompareResultDetails(path.join(trialDir, metadata.result), metadata.status)
  };
}

function researchCompareMetadata(
  value: Record<string, unknown>,
  invalidReason: string[]
): ResearchCompareMetadata | undefined {
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
    status,
    submissionProtocol: submissionProtocol(value)
  };
}

function readCompareResultDetails(
  resultPath: string,
  expectedStatus: BenchmarkStatus
): ResearchCompareResultDetails | undefined {
  const invalidReason: string[] = [];
  const resultFile = readJsonObject(resultPath, 'result.json');

  invalidReason.push(...resultFile.invalidReason);

  if (!resultFile.value) {
    return undefined;
  }

  const status = requiredBenchmarkStatus(resultFile.value.status, 'result.json status', invalidReason);
  const summary = benchmarkSuiteSummary(resultFile.value.summary, invalidReason);
  const results = taskResults(resultFile.value.results, invalidReason);

  if (status && status !== expectedStatus) {
    invalidReason.push(`metadata status ${expectedStatus} does not match result status ${status}`);
  }

  if (summary && results && summary.total !== results.length) {
    invalidReason.push(`result summary total ${summary.total} does not match results length ${results.length}`);
  }

  if (!status || !summary || !results || invalidReason.length > 0) {
    return undefined;
  }

  return {
    status,
    summary,
    results
  };
}

function taskResults(value: unknown, invalidReason: string[]): TrialTaskResult[] | undefined {
  if (!Array.isArray(value)) {
    invalidReason.push('result results must be an array');
    return undefined;
  }

  const seenTaskIds = new Set<string>();
  const results: TrialTaskResult[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      invalidReason.push(`result results[${index}] must be a JSON object`);
      continue;
    }

    const taskId = item.taskId;
    const status = item.status;
    const title = item.title;

    if (typeof taskId !== 'string' || taskId.length === 0) {
      invalidReason.push(`result results[${index}] taskId must be a non-empty string`);
      continue;
    }
    if (seenTaskIds.has(taskId)) {
      invalidReason.push(`result results[${index}] taskId duplicates ${taskId}`);
      continue;
    }
    if (!isBenchmarkStatus(status)) {
      invalidReason.push(`result results[${index}] status must be passed, failed, disallowed, or error`);
      continue;
    }
    if (!(typeof title === 'string' || title === null || title === undefined)) {
      invalidReason.push(`result results[${index}] title must be a string or null`);
      continue;
    }

    seenTaskIds.add(taskId);
    results.push({
      taskId,
      title: typeof title === 'string' ? title : null,
      status
    });
  }

  return invalidReason.length > 0 ? undefined : results;
}

function researchCompareTrial(
  relativePath: string,
  metadata: ResearchCompareMetadata,
  summary: BenchmarkSuiteSummary
): ResearchCompareTrial {
  return {
    id: metadata.id,
    createdAt: metadata.createdAt,
    collaborator: metadata.collaborator,
    benchmark: metadata.benchmark,
    status: metadata.status,
    score: {
      passed: summary.passed,
      total: summary.total,
      percent: summary.total === 0 ? null : (summary.passed / summary.total) * 100
    },
    submissionProtocol: metadata.submissionProtocol,
    path: relativePath
  };
}

function submissionProtocol(value: Record<string, unknown>): string | null {
  const protocol = value.submissionProtocol;

  return typeof protocol === 'string' && protocol.length > 0 ? protocol : null;
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

function researchCompareTasks(included: readonly IncludedTrial[]): ResearchCompareTask[] {
  const titleByTaskId = new Map<string, string | null>();
  const statusByTrialAndTask = new Map<string, Map<string, BenchmarkStatus>>();

  for (const item of included) {
    const trialStatuses = new Map<string, BenchmarkStatus>();

    for (const result of item.details) {
      if (!titleByTaskId.has(result.taskId) || titleByTaskId.get(result.taskId) === null) {
        titleByTaskId.set(result.taskId, result.title);
      }
      trialStatuses.set(result.taskId, result.status);
    }

    statusByTrialAndTask.set(item.trial.id, trialStatuses);
  }

  return [...titleByTaskId.keys()].sort().map((taskId) => {
    const results = included.map((item): ResearchCompareTaskResult => ({
      trialId: item.trial.id,
      status: statusByTrialAndTask.get(item.trial.id)?.get(taskId) ?? 'missing'
    }));
    const statusCounts = taskStatusCounts(results);

    return {
      taskId,
      title: titleByTaskId.get(taskId) ?? null,
      results,
      statusCounts,
      differs: new Set(results.map((result) => result.status)).size > 1
    };
  });
}

function taskStatusCounts(results: readonly ResearchCompareTaskResult[]): ResearchCompareTaskStatusCounts {
  const counts = {
    passed: 0,
    failed: 0,
    disallowed: 0,
    error: 0,
    missing: 0
  };

  for (const result of results) {
    counts[result.status] += 1;
  }

  return counts;
}

function researchCompareWarnings(trials: readonly ResearchCompareTrial[]): ResearchCompareWarning[] {
  const protocols = [...new Set(trials.map((trial) => trial.submissionProtocol ?? 'unspecified'))].sort();

  return protocols.length > 1
    ? [{ type: 'mixed-submission-protocols', submissionProtocols: protocols }]
    : [];
}

function taskMatrixLines(compare: ResearchCompare): string[] {
  const taskIdWidth = Math.max('taskId'.length, ...compare.tasks.map((task) => task.taskId.length));
  const titleWidth = Math.max('title'.length, ...compare.tasks.map((task) => (task.title ?? '-').length));
  const trialWidths = compare.trials.map((trial, index) => Math.max(
    trial.id.length,
    ...compare.tasks.map((task) => task.results[index]?.status.length ?? 0)
  ));
  const header = [
    '  ',
    'taskId'.padEnd(taskIdWidth),
    '  ',
    'title'.padEnd(titleWidth),
    '  ',
    ...compare.trials.flatMap((trial, index) => [trial.id.padEnd(trialWidths[index] ?? trial.id.length), '  '])
  ].join('').trimEnd();
  const rows = compare.tasks.map((task) => [
    '  ',
    task.taskId.padEnd(taskIdWidth),
    '  ',
    (task.title ?? '-').padEnd(titleWidth),
    '  ',
    ...task.results.flatMap((result, index) => [result.status.padEnd(trialWidths[index] ?? result.status.length), '  '])
  ].join('').trimEnd());

  return [header, ...rows];
}

function formatScore(score: ResearchCompareScore): string {
  return `${score.passed}/${score.total} (${score.percent === null ? 'n/a' : `${score.percent.toFixed(2)}%`})`;
}

function formatStatusCounts(counts: ResearchCompareTaskStatusCounts): string {
  return STATUS_ORDER.map((status) => `${status} ${counts[status]}`).join(', ');
}

function readJsonObject(filePath: string, displayName: string): JsonObjectReadResult {
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

function compareResearchCompareCandidates(left: ResearchCompareCandidate, right: ResearchCompareCandidate): number {
  const timestampOrder = timestampPart(right.id).localeCompare(timestampPart(left.id));

  return timestampOrder === 0 ? left.id.localeCompare(right.id) : timestampOrder;
}

function timestampPart(id: string): string {
  return RESEARCH_TRIAL_TIMESTAMP_PATTERN.exec(id)?.[1] ?? '';
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
