import type { BenchmarkTask, ComplexAmplitude } from '../evaluation_runner/benchmark_task';
import type { CommandHandlerContext } from '../dispatcher';
import {
  gradeBenchmarkSuite,
  gradeBenchmarkTaskForReport,
  type AmplitudeMismatch,
  type BenchmarkCheckResult,
  type BenchmarkResult,
  type BenchmarkSuiteGradingResult,
  type BenchmarkTaskGradingReport,
  type BenchmarkTaskGradingResult,
  type ExpectationMismatch,
  type ExpectCheckResult,
  type RunCheckResult
} from '../evaluation_runner/benchmark_grading';

export { streamChunkText } from '../evaluation_runner/benchmark_grading';

type BenchmarkOutputFormat = 'human' | 'json';

type BenchmarkRequest = BenchmarkRunRequest | BenchmarkSuiteRequest;

interface BenchmarkRunRequest {
  readonly format: BenchmarkOutputFormat;
  readonly kind: 'run';
  readonly submissionFile: string;
  readonly taskFile: string;
}

interface BenchmarkSuiteRequest {
  readonly benchmarkDir: string;
  readonly format: BenchmarkOutputFormat;
  readonly kind: 'run-all';
  readonly solutionsDir: string;
}

class BenchmarkCommandError extends Error {}

const USAGE = [
  'Usage: qni benchmark run <task-file> <submission-file> [--json]',
  '       qni benchmark run-all <benchmark-dir> <solutions-dir> [--json]',
  ''
].join('\n');
const MAX_FAILED_AMPLITUDE_DETAILS = 16;
const MAX_FAILED_EXPECTATION_DETAILS = 16;

export function runBenchmarkCommand(argv: string[], context: CommandHandlerContext): number {
  const request = parseBenchmarkRequest(argv);

  if (!request) {
    process.stderr.write(USAGE);
    return 3;
  }

  switch (request.kind) {
    case 'run':
      return runSingleBenchmark(request, context);
    case 'run-all':
      return runBenchmarkSuite(request, context);
  }
}

function runSingleBenchmark(request: BenchmarkRunRequest, context: CommandHandlerContext): number {
  const report = gradeBenchmarkTaskForReport(request, context);

  writeBenchmarkResult({
    format: request.format,
    report
  });
  return report.gradingResult.exitCode;
}

function runBenchmarkSuite(request: BenchmarkSuiteRequest, context: CommandHandlerContext): number {
  const suite = gradeBenchmarkSuite(request, context);

  writeBenchmarkSuiteResult({
    format: request.format,
    suite
  });
  return suite.exitCode;
}

function parseBenchmarkRequest(argv: readonly string[]): BenchmarkRequest | undefined {
  if (argv[0] !== 'benchmark') {
    return undefined;
  }

  const subcommand = argv[1];
  const args = argv.slice(2);
  const parsed = benchmarkPositionalArgs(args);

  if (!parsed || parsed.positional.length !== 2) {
    return undefined;
  }

  switch (subcommand) {
    case 'run':
      return {
        format: parsed.format,
        kind: 'run',
        submissionFile: parsed.positional[1] ?? '',
        taskFile: parsed.positional[0] ?? ''
      };
    case 'run-all':
      return {
        benchmarkDir: parsed.positional[0] ?? '',
        format: parsed.format,
        kind: 'run-all',
        solutionsDir: parsed.positional[1] ?? ''
      };
    default:
      return undefined;
  }
}

function benchmarkPositionalArgs(args: readonly string[]): {
  readonly format: BenchmarkOutputFormat;
  readonly positional: readonly string[];
} | undefined {
  const jsonFlagCount = args.filter((arg) => arg === '--json').length;

  if (jsonFlagCount > 1 || args.some((arg) => arg.startsWith('--') && arg !== '--json')) {
    return undefined;
  }

  return {
    format: jsonFlagCount === 1 ? 'json' : 'human',
    positional: args.filter((arg) => arg !== '--json')
  };
}

function writeBenchmarkResult(options: {
  readonly format: BenchmarkOutputFormat;
  readonly report: BenchmarkTaskGradingReport;
}): void {
  if (options.format === 'json') {
    writeJsonResult(options.report.gradingResult);
    return;
  }

  writeHumanResult(options.report.task, options.report.result);
}

function writeBenchmarkSuiteResult(options: {
  readonly format: BenchmarkOutputFormat;
  readonly suite: BenchmarkSuiteGradingResult;
}): void {
  if (options.format === 'json') {
    writeJsonSuiteResult(options.suite);
    return;
  }

  writeHumanSuiteResult(options.suite);
}

function writeHumanSuiteResult(suite: BenchmarkSuiteGradingResult): void {
  if (suite.results.length === 0 && suite.status === 'error') {
    process.stdout.write('ERROR benchmark suite\n');
    if (suite.error) {
      process.stdout.write(`error: ${suite.error}\n`);
    }
    return;
  }

  process.stdout.write(`${suite.status === 'passed' ? 'PASS' : 'FAIL'} benchmark suite\n`);
  process.stdout.write(`tasks: ${suite.summary.total}\n`);
  process.stdout.write([
    `passed: ${suite.summary.passed}`,
    `failed: ${suite.summary.failed}`,
    `disallowed: ${suite.summary.disallowed}`,
    `error: ${suite.summary.error}`
  ].join(', '));
  process.stdout.write('\n');

  for (const item of suite.results) {
    process.stdout.write(`- ${item.status} ${item.taskId ?? item.task} ${item.title ?? '(unavailable)'}\n`);
  }
}

function writeJsonSuiteResult(suite: BenchmarkSuiteGradingResult): void {
  process.stdout.write(`${JSON.stringify(suite, null, 2)}\n`);
}

function writeHumanResult(task: BenchmarkTask | undefined, result: BenchmarkResult): void {
  if (result.status === 'error') {
    writeErrorResult(task, result);
    return;
  }

  if (!task) {
    throw new BenchmarkCommandError('benchmark task is unavailable');
  }

  if (result.status === 'disallowed') {
    writeDisallowedResult(task, result);
    return;
  }

  const label = result.status === 'passed' ? 'PASS' : 'FAIL';

  process.stdout.write(`${label} ${task.title}\n`);
  process.stdout.write(`checks: ${result.checks.length}\n`);
  writeFailedCheckDetails(result);
}

function writeJsonResult(result: BenchmarkTaskGradingResult): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function writeErrorResult(task: BenchmarkTask | undefined, result: BenchmarkResult): void {
  process.stdout.write(`ERROR ${task?.title ?? 'benchmark run'}\n`);
  if (result.errorMessage) {
    process.stdout.write(`error: ${result.errorMessage}\n`);
  }
}

function writeFailedCheckDetails(result: BenchmarkResult): void {
  const failedChecks = result.checks
    .map((check, index) => ({ check, index }))
    .filter((item) => item.check.status === 'failed');

  if (failedChecks.length === 0) {
    return;
  }

  process.stdout.write('failed checks:\n');

  for (const failedCheck of failedChecks) {
    process.stdout.write(`${failedCheckLines(failedCheck.check, failedCheck.index).join('\n')}\n`);
  }
}

function failedCheckLines(check: BenchmarkCheckResult, index: number): string[] {
  switch (check.type) {
    case 'expect':
      return failedExpectationCheckLines(check, index);
    case 'run':
      return failedRunCheckLines(check, index);
  }
}

function failedRunCheckLines(check: RunCheckResult, index: number): string[] {
  return [
    `- ${check.type} #${index + 1}: state vector did not match expected amplitudes`,
    '  expected / actual mismatches:',
    ...displayedAmplitudeMismatches(check.mismatches.displayed),
    ...omittedAmplitudeMismatchLines(check.mismatches.omittedCount)
  ];
}

function failedExpectationCheckLines(check: ExpectCheckResult, index: number): string[] {
  return [
    `- ${check.type} #${index + 1}: expectation values did not match expected values`,
    '  expected / actual mismatches:',
    ...displayedExpectationMismatches(check.mismatches.displayed),
    ...omittedExpectationMismatchLines(check.mismatches.omittedCount)
  ];
}

function displayedAmplitudeMismatches(mismatches: readonly AmplitudeMismatch[]): string[] {
  return mismatches
    .slice(0, MAX_FAILED_AMPLITUDE_DETAILS)
    .map((mismatch) => [
      `  - ${mismatch.basis}:`,
      `expected ${formatComplexAmplitude(mismatch.expected)},`,
      `actual ${formatComplexAmplitude(mismatch.actual)}`
    ].join(' '));
}

function displayedExpectationMismatches(mismatches: readonly ExpectationMismatch[]): string[] {
  return mismatches
    .slice(0, MAX_FAILED_EXPECTATION_DETAILS)
    .map((mismatch) => [
      `  - ${mismatch.pauli}:`,
      `expected ${formatNumber(mismatch.expected)},`,
      `actual ${formatComplexAmplitude(mismatch.actual)}`
    ].join(' '));
}

function omittedAmplitudeMismatchLines(omittedCount: number): string[] {
  if (omittedCount <= 0) {
    return [];
  }

  return [`  ... ${omittedCount} more mismatched amplitudes omitted`];
}

function omittedExpectationMismatchLines(omittedCount: number): string[] {
  if (omittedCount <= 0) {
    return [];
  }

  return [`  ... ${omittedCount} more mismatched expectation values omitted`];
}

function formatComplexAmplitude(amplitude: ComplexAmplitude): string {
  if (amplitude.imaginary === 0) {
    return formatNumber(amplitude.real);
  }

  if (amplitude.real === 0) {
    return `${formatNumber(amplitude.imaginary)}i`;
  }

  return `${formatNumber(amplitude.real)}${amplitude.imaginary >= 0 ? '+' : ''}${formatNumber(amplitude.imaginary)}i`;
}

function formatNumber(value: number): string {
  return Object.is(value, -0) ? '0' : String(value);
}

function writeDisallowedResult(task: BenchmarkTask, result: BenchmarkResult): void {
  const rejected = result.disallowedSubmission?.command;

  process.stdout.write(`DISALLOWED ${task.title}\n`);
  if (rejected) {
    process.stdout.write(`rejected: line ${rejected.lineNumber}: ${rejected.source}\n`);
  }
  process.stdout.write(`allowed commands: ${task.allowedCommands.map((command) => command.source).join(', ')}\n`);
}
