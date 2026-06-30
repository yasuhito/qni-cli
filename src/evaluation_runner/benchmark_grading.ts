import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');

import type { CommandHandler, CommandHandlerContext } from '../dispatcher';
import { runAddCommand } from '../commands/add_command';
import { runExpectCommand } from '../commands/expect_command';
import { runRunCommand } from '../commands/run_command';
import {
  loadBenchmarkTask,
  type BenchmarkCheck,
  type BenchmarkTask,
  type ComplexAmplitude,
  type ExpectedAmplitude,
  type ExpectedExpectation,
  type ExpectCheck,
  type RunCheck
} from './benchmark_task';
import {
  readBenchmarkSubmission,
  type DisallowedSubmission,
  type SubmissionCommand
} from './benchmark_submission';

interface ExpectedStateVector {
  readonly amplitudes: ReadonlyMap<number, ComplexAmplitude>;
  readonly vectorLength: number;
}

interface BasisMetadata {
  readonly index: number;
  readonly vectorLength: number;
}

interface QniCommandResult {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type BenchmarkStatus = 'passed' | 'failed' | 'disallowed' | 'error';

export interface BenchmarkTaskGradingRequest {
  readonly submissionFile: string;
  readonly taskFile: string;
}

export interface BenchmarkSuiteGradingRequest {
  readonly benchmarkDir: string;
  readonly solutionsDir: string;
}

export interface BenchmarkCheckSummary {
  readonly status: 'failed' | 'passed';
  readonly type: 'expect' | 'run';
}

export interface BenchmarkTaskGradingResult {
  readonly checks: readonly BenchmarkCheckSummary[];
  readonly error?: string;
  readonly exitCode: number;
  readonly status: BenchmarkStatus;
  readonly submission: string;
  readonly taskId: string | null;
  readonly title: string | null;
}

export interface BenchmarkSuiteTaskGradingResult extends BenchmarkTaskGradingResult {
  readonly task: string;
}

export interface BenchmarkSuiteGradingResult {
  readonly error?: string;
  readonly exitCode: number;
  readonly results: readonly BenchmarkSuiteTaskGradingResult[];
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

export interface BenchmarkResult {
  readonly checks: readonly BenchmarkCheckResult[];
  readonly disallowedSubmission?: DisallowedSubmission;
  readonly errorMessage?: string;
  readonly status: BenchmarkStatus;
}

export interface BenchmarkTaskGradingReport {
  readonly gradingResult: BenchmarkTaskGradingResult;
  readonly result: BenchmarkResult;
  readonly task?: BenchmarkTask;
}

interface BenchmarkSuiteEntry {
  readonly submission: string;
  readonly submissionPath: string;
  readonly taskFile: string;
  readonly taskPath: string;
}

interface BenchmarkSuiteTaskResult {
  readonly result: BenchmarkResult;
  readonly submission: string;
  readonly task?: BenchmarkTask;
  readonly taskFile: string;
}

interface BenchmarkSuiteResult {
  readonly errorMessage?: string;
  readonly exitCode: number;
  readonly results: readonly BenchmarkSuiteTaskResult[];
  readonly status: BenchmarkStatus;
  readonly summary: BenchmarkSuiteSummary;
}

export interface BenchmarkSuiteSummary {
  readonly disallowed: number;
  readonly error: number;
  readonly failed: number;
  readonly passed: number;
  readonly total: number;
}

export type BenchmarkCheckResult = ExpectCheckResult | RunCheckResult;

export interface RunCheckResult {
  readonly mismatches: MismatchSummary;
  readonly status: 'passed' | 'failed';
  readonly type: 'run';
}

export interface ExpectCheckResult {
  readonly mismatches: ExpectationMismatchSummary;
  readonly status: 'passed' | 'failed';
  readonly type: 'expect';
}

export interface MismatchSummary {
  readonly displayed: readonly AmplitudeMismatch[];
  readonly omittedCount: number;
}

export interface ExpectationMismatchSummary {
  readonly displayed: readonly ExpectationMismatch[];
  readonly omittedCount: number;
}

export interface AmplitudeMismatch {
  readonly actual: ComplexAmplitude;
  readonly basis: string;
  readonly expected: ComplexAmplitude;
}

export interface ExpectationMismatch {
  readonly actual: ComplexAmplitude;
  readonly expected: number;
  readonly pauli: string;
}

class BenchmarkError extends Error {}

const QNI_COMMAND_HANDLERS = new Map<string, CommandHandler>([
  ['add', runAddCommand],
  ['expect', runExpectCommand],
  ['run', runRunCommand]
]);
const MAX_FAILED_AMPLITUDE_DETAILS = 16;
const MAX_FAILED_EXPECTATION_DETAILS = 16;
const ZERO_AMPLITUDE: ComplexAmplitude = { imaginary: 0, real: 0 };

/**
 * Runs the single benchmark task grader without writing the task report to stdout.
 * The returned shape matches the `qni benchmark run --json` payload.
 */
export function gradeBenchmarkTask(
  request: BenchmarkTaskGradingRequest,
  context: CommandHandlerContext
): BenchmarkTaskGradingResult {
  return gradeBenchmarkTaskForReport(request, context).gradingResult;
}

/**
 * Runs the benchmark suite grader without writing the suite report to stdout.
 * The returned shape matches the `qni benchmark run-all --json` payload.
 */
export function gradeBenchmarkSuite(
  request: BenchmarkSuiteGradingRequest,
  context: CommandHandlerContext
): BenchmarkSuiteGradingResult {
  return benchmarkSuiteGradingResult(evaluateBenchmarkSuite(request, context));
}

/**
 * Runs the single benchmark task grader and returns the JSON-compatible result
 * plus rich details that the benchmark CLI adapter needs for human output.
 */
export function gradeBenchmarkTaskForReport(
  request: BenchmarkTaskGradingRequest,
  context: CommandHandlerContext
): BenchmarkTaskGradingReport {
  let task: BenchmarkTask | undefined;

  try {
    const taskPath = resolveInputPath(request.taskFile, context);
    const submissionPath = resolveInputPath(request.submissionFile, context);
    task = loadBenchmarkTask(taskPath);
    const result = evaluateBenchmark({
      context,
      submissionPath,
      task
    });

    return {
      gradingResult: benchmarkResultPayload(task, request.submissionFile, result),
      result,
      task
    };
  } catch (error) {
    const result: BenchmarkResult = {
      checks: [],
      errorMessage: errorMessage(error),
      status: 'error'
    };

    return {
      gradingResult: benchmarkResultPayload(task, request.submissionFile, result),
      result,
      task
    };
  }
}

function evaluateBenchmarkSuite(
  request: BenchmarkSuiteGradingRequest,
  context: CommandHandlerContext
): BenchmarkSuiteResult {
  try {
    const benchmarkDirPath = resolveInputPath(request.benchmarkDir, context);
    const solutionsDirPath = resolveInputPath(request.solutionsDir, context);
    const entries = benchmarkSuiteEntries({
      benchmarkDir: request.benchmarkDir,
      benchmarkDirPath,
      solutionsDir: request.solutionsDir,
      solutionsDirPath
    });

    return benchmarkSuiteResult(entries.map((entry) => evaluateBenchmarkSuiteEntry(entry, context)));
  } catch (error) {
    return {
      errorMessage: errorMessage(error),
      exitCode: 3,
      results: [],
      status: 'error',
      summary: {
        disallowed: 0,
        error: 1,
        failed: 0,
        passed: 0,
        total: 0
      }
    };
  }
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}

function evaluateBenchmark(options: {
  readonly context: CommandHandlerContext;
  readonly submissionPath: string;
  readonly task: BenchmarkTask;
}): BenchmarkResult {
  const submission = readBenchmarkSubmission({
    allowedCommands: options.task.allowedCommands,
    submissionPath: options.submissionPath
  });

  if (submission.kind === 'disallowed') {
    return {
      checks: [],
      disallowedSubmission: submission.disallowedSubmission,
      status: 'disallowed'
    };
  }

  const workDir = mkdtempSync(path.join(tmpdir(), 'qni-benchmark-'));

  try {
    runSubmission(submission.commands, workDir, options.context);
    const checks = options.task.checks.items.map((check) => runBenchmarkCheck(check, options.task, workDir, options.context));

    return {
      checks,
      status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed'
    };
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
}

function benchmarkSuiteEntries(options: {
  readonly benchmarkDir: string;
  readonly benchmarkDirPath: string;
  readonly solutionsDir: string;
  readonly solutionsDirPath: string;
}): BenchmarkSuiteEntry[] {
  const relativeTaskFiles = markdownFilesInDirectory(options.benchmarkDirPath);

  if (relativeTaskFiles.length === 0) {
    throw new BenchmarkError(`benchmark directory contains no task files: ${options.benchmarkDir}`);
  }

  return relativeTaskFiles.map((relativeTaskFile) => {
    const relativeSubmissionFile = relativeTaskFile.replace(/\.md$/u, '.qni');

    return {
      submission: displayChildPath(options.solutionsDir, relativeSubmissionFile),
      submissionPath: path.join(options.solutionsDirPath, relativeSubmissionFile),
      taskFile: displayChildPath(options.benchmarkDir, relativeTaskFile),
      taskPath: path.join(options.benchmarkDirPath, relativeTaskFile)
    };
  });
}

function markdownFilesInDirectory(dir: string): string[] {
  if (!existsSync(dir)) {
    throw new BenchmarkError(`benchmark directory does not exist: ${dir}`);
  }

  if (!statSync(dir).isDirectory()) {
    throw new BenchmarkError(`benchmark path is not a directory: ${dir}`);
  }

  return markdownFilesInDirectoryEntries(dir, '').sort();
}

function markdownFilesInDirectoryEntries(root: string, relativeDir: string): string[] {
  const dir = path.join(root, relativeDir);
  const entries = readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...markdownFilesInDirectoryEntries(root, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

function displayChildPath(root: string, relativeFile: string): string {
  return toPosixPath(path.join(root, relativeFile));
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function evaluateBenchmarkSuiteEntry(entry: BenchmarkSuiteEntry, context: CommandHandlerContext): BenchmarkSuiteTaskResult {
  let task: BenchmarkTask | undefined;

  try {
    task = loadBenchmarkTask(entry.taskPath);

    if (!existsSync(entry.submissionPath)) {
      throw new BenchmarkError(`submission file does not exist: ${entry.submission}`);
    }

    return {
      result: evaluateBenchmark({
        context,
        submissionPath: entry.submissionPath,
        task
      }),
      submission: entry.submission,
      task,
      taskFile: entry.taskFile
    };
  } catch (error) {
    return {
      result: {
        checks: [],
        errorMessage: errorMessage(error),
        status: 'error'
      },
      submission: entry.submission,
      task,
      taskFile: entry.taskFile
    };
  }
}

function benchmarkSuiteResult(results: readonly BenchmarkSuiteTaskResult[]): BenchmarkSuiteResult {
  const summary = benchmarkSuiteSummary(results);
  const exitCode = Math.max(0, ...results.map((item) => exitCodeForResult(item.result)));

  return {
    exitCode,
    results,
    status: benchmarkSuiteStatus(exitCode),
    summary
  };
}

function benchmarkSuiteSummary(results: readonly BenchmarkSuiteTaskResult[]): BenchmarkSuiteSummary {
  return {
    disallowed: results.filter((item) => item.result.status === 'disallowed').length,
    error: results.filter((item) => item.result.status === 'error').length,
    failed: results.filter((item) => item.result.status === 'failed').length,
    passed: results.filter((item) => item.result.status === 'passed').length,
    total: results.length
  };
}

function benchmarkSuiteStatus(exitCode: number): BenchmarkStatus {
  switch (exitCode) {
    case 0:
      return 'passed';
    case 1:
      return 'failed';
    case 2:
      return 'disallowed';
    case 3:
      return 'error';
    default:
      throw new BenchmarkError(`unsupported benchmark suite exit code: ${exitCode}`);
  }
}

function benchmarkSuiteGradingResult(suite: BenchmarkSuiteResult): BenchmarkSuiteGradingResult {
  const payload: BenchmarkSuiteGradingResult = {
    status: suite.status,
    exitCode: suite.exitCode,
    summary: suite.summary,
    results: suite.results.map(benchmarkSuiteTaskGradingResult)
  };

  if (suite.errorMessage) {
    return {
      ...payload,
      error: suite.errorMessage
    };
  }

  return payload;
}

function benchmarkSuiteTaskGradingResult(item: BenchmarkSuiteTaskResult): BenchmarkSuiteTaskGradingResult {
  return {
    ...benchmarkResultPayload(item.task, item.submission, item.result),
    task: item.taskFile
  };
}

function runSubmission(commands: readonly SubmissionCommand[], workDir: string, context: CommandHandlerContext): void {
  for (const command of commands) {
    const result = runQni(command.argv, workDir, context);

    if (result.exitStatus !== 0) {
      throw new BenchmarkError([
        `submission command failed at line ${command.lineNumber}: ${command.source}`,
        result.stderr.trimEnd()
      ].filter(Boolean).join('\n'));
    }
  }
}

function runBenchmarkCheck(
  check: BenchmarkCheck,
  task: BenchmarkTask,
  workDir: string,
  context: CommandHandlerContext
): BenchmarkCheckResult {
  switch (check.type) {
    case 'expect':
      return runExpectCheck(check, task, workDir, context);
    case 'run':
      return runRunCheck(check, task, workDir, context);
  }
}

function runRunCheck(
  check: RunCheck,
  task: BenchmarkTask,
  workDir: string,
  context: CommandHandlerContext
): RunCheckResult {
  const result = runQni(['run'], workDir, context);

  if (result.exitStatus !== 0) {
    throw new BenchmarkError(`run check failed to execute for ${task.id}: ${result.stderr.trimEnd()}`);
  }

  const actual = parseStateVector(result.stdout);
  const expected = expectedStateVector(check.expected);
  const mismatches = stateVectorMismatchSummary(actual, expected, task.checks.tolerance);

  return {
    mismatches,
    status: mismatches.displayed.length === 0 && mismatches.omittedCount === 0 ? 'passed' : 'failed',
    type: 'run'
  };
}

function runExpectCheck(
  check: ExpectCheck,
  task: BenchmarkTask,
  workDir: string,
  context: CommandHandlerContext
): ExpectCheckResult {
  const result = runQni(['expect', ...check.expected.map((item) => item.pauli)], workDir, context);

  if (result.exitStatus !== 0) {
    throw new BenchmarkError(`expect check failed to execute for ${task.id}: ${result.stderr.trimEnd()}`);
  }

  const actual = parseExpectationValues(result.stdout);
  const mismatches = expectationMismatchSummary(actual, check.expected, task.checks.tolerance);

  return {
    mismatches,
    status: mismatches.displayed.length === 0 && mismatches.omittedCount === 0 ? 'passed' : 'failed',
    type: 'expect'
  };
}

function expectedStateVector(expectedAmplitudes: readonly ExpectedAmplitude[]): ExpectedStateVector {
  const amplitudes = new Map<number, ComplexAmplitude>();
  let vectorLength = 1;

  for (const item of expectedAmplitudes) {
    const basis = basisMetadata(item.basis);
    amplitudes.set(basis.index, item.amplitude);
    vectorLength = Math.max(vectorLength, basis.vectorLength);
  }

  return { amplitudes, vectorLength };
}

function stateVectorMismatchSummary(
  actual: readonly ComplexAmplitude[],
  expected: ExpectedStateVector,
  tolerance: number
): MismatchSummary {
  const displayed: AmplitudeMismatch[] = [];
  let mismatchCount = 0;
  const vectorLength = Math.max(actual.length, expected.vectorLength);

  for (let index = 0; index < vectorLength; index += 1) {
    const amplitude = actual[index] ?? ZERO_AMPLITUDE;
    const expectedAmplitude = expected.amplitudes.get(index) ?? ZERO_AMPLITUDE;

    if (amplitudesClose(amplitude, expectedAmplitude, tolerance)) {
      continue;
    }

    mismatchCount += 1;

    if (displayed.length < MAX_FAILED_AMPLITUDE_DETAILS) {
      displayed.push({
        actual: amplitude,
        basis: basisLabel(index, vectorLength),
        expected: expectedAmplitude
      });
    }
  }

  return {
    displayed,
    omittedCount: mismatchCount - displayed.length
  };
}

function amplitudesClose(actual: ComplexAmplitude, expected: ComplexAmplitude, tolerance: number): boolean {
  return Math.abs(actual.real - expected.real) <= tolerance &&
    Math.abs(actual.imaginary - expected.imaginary) <= tolerance;
}

function expectationMismatchSummary(
  actual: ReadonlyMap<string, ComplexAmplitude>,
  expected: readonly ExpectedExpectation[],
  tolerance: number
): ExpectationMismatchSummary {
  const displayed: ExpectationMismatch[] = [];
  let mismatchCount = 0;

  for (const item of expected) {
    const actualValue = actual.get(item.pauli) ?? ZERO_AMPLITUDE;

    if (expectationClose(actualValue, item.value, tolerance)) {
      continue;
    }

    mismatchCount += 1;

    if (displayed.length < MAX_FAILED_EXPECTATION_DETAILS) {
      displayed.push({
        actual: actualValue,
        expected: item.value,
        pauli: item.pauli
      });
    }
  }

  return {
    displayed,
    omittedCount: mismatchCount - displayed.length
  };
}

function expectationClose(actual: ComplexAmplitude, expected: number, tolerance: number): boolean {
  return Math.abs(actual.real - expected) <= tolerance && Math.abs(actual.imaginary) <= tolerance;
}

function parseExpectationValues(stdout: string): ReadonlyMap<string, ComplexAmplitude> {
  const text = stdout.trim();

  if (text.length === 0) {
    throw new BenchmarkError('qni expect produced empty expectation output');
  }

  return new Map(text.split(/\r?\n/u).map(parseExpectationValueLine));
}

function parseExpectationValueLine(line: string): [string, ComplexAmplitude] {
  const match = /^(?<pauli>[IXYZ]+)=(?<value>.+)$/u.exec(line.trim());

  if (!match?.groups) {
    throw new BenchmarkError(`qni expect produced unparsable output: ${line}`);
  }

  return [match.groups.pauli, parseComplexAmplitude(match.groups.value)];
}

function parseStateVector(stdout: string): ComplexAmplitude[] {
  const text = stdout.trim();

  if (text.length === 0) {
    throw new BenchmarkError('qni run produced empty state vector output');
  }

  return text.split(',').map(parseComplexAmplitude);
}

function parseComplexAmplitude(text: string): ComplexAmplitude {
  if (!text.endsWith('i')) {
    return { imaginary: 0, real: parseNumber(text) };
  }

  const body = text.slice(0, -1);
  const splitIndex = lastSignIndex(body);

  if (splitIndex === -1) {
    return { imaginary: parseNumber(body), real: 0 };
  }

  return {
    imaginary: parseNumber(body.slice(splitIndex)),
    real: parseNumber(body.slice(0, splitIndex))
  };
}

function lastSignIndex(value: string): number {
  for (let index = value.length - 1; index > 0; index -= 1) {
    if ((value[index] === '+' || value[index] === '-') && !exponentSign(value, index)) {
      return index;
    }
  }

  return -1;
}

function exponentSign(value: string, index: number): boolean {
  return value[index - 1] === 'e' || value[index - 1] === 'E';
}

function basisMetadata(basis: string): BasisMetadata {
  const match = /^\|(?<bits>[01]+)>$/u.exec(basis);

  if (!match?.groups) {
    throw new BenchmarkError(`unsupported basis label: ${basis}`);
  }

  return {
    index: Number.parseInt(match.groups.bits, 2),
    vectorLength: 2 ** match.groups.bits.length
  };
}

function runQni(argv: readonly string[], cwd: string, context: CommandHandlerContext): QniCommandResult {
  const command = argv[0] ?? '';
  const handler = QNI_COMMAND_HANDLERS.get(command);

  if (!handler) {
    throw new BenchmarkError(`unsupported qni command in benchmark runner: qni ${argv.join(' ')}`);
  }

  return captureCommandRun(() => handler([...argv], { ...context, cwd }));
}

function captureCommandRun(callback: () => number): QniCommandResult {
  let stdout = '';
  let stderr = '';
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean => {
    stdout += streamChunkText(chunk);
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
    stderr += streamChunkText(chunk);
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      exitStatus: callback(),
      stderr,
      stdout
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

function streamChunkText(chunk: string | Uint8Array): string {
  return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

function parseNumber(value: unknown): number {
  const result = typeof value === 'number' ? value : Number(String(value));

  if (Number.isNaN(result)) {
    throw new BenchmarkError(`invalid number: ${String(value)}`);
  }

  return result;
}

function resolveInputPath(filePath: string, context: CommandHandlerContext): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  const cwdPath = path.resolve(context.cwd, filePath);

  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return path.resolve(context.projectRoot, filePath);
}

function benchmarkResultPayload(
  task: BenchmarkTask | undefined,
  submission: string,
  result: BenchmarkResult
): BenchmarkTaskGradingResult {
  const payload: BenchmarkTaskGradingResult = {
    taskId: task?.id ?? null,
    title: task?.title ?? null,
    submission,
    status: result.status,
    exitCode: exitCodeForResult(result),
    checks: result.checks.map((check) => ({
      type: check.type,
      status: check.status
    }))
  };

  if (result.errorMessage) {
    return {
      ...payload,
      error: result.errorMessage
    };
  }

  return payload;
}

function exitCodeForResult(result: BenchmarkResult): number {
  return exitCodeForBenchmarkStatus(result.status);
}

export function exitCodeForBenchmarkStatus(status: BenchmarkStatus): number {
  switch (status) {
    case 'passed':
      return 0;
    case 'failed':
      return 1;
    case 'disallowed':
      return 2;
    case 'error':
      return 3;
  }
}

function basisLabel(index: number, vectorLength: number): string {
  const width = Math.log2(vectorLength);

  if (!Number.isInteger(width)) {
    throw new BenchmarkError(`state vector length is not a power of two: ${vectorLength}`);
  }

  return `|${index.toString(2).padStart(width, '0')}>`;
}
