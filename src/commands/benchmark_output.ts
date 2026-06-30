import type { BenchmarkTask, ComplexAmplitude } from '../evaluation_runner/benchmark_task';
import type {
  AmplitudeMismatch,
  BenchmarkCheckResult,
  BenchmarkResult,
  BenchmarkSuiteGradingResult,
  BenchmarkTaskGradingResult,
  BenchmarkTaskGradingReport,
  ExpectationMismatch,
  ExpectCheckResult,
  RunCheckResult
} from '../evaluation_runner/benchmark_grading';

export interface BenchmarkCommandReport<TJsonOutput> {
  readonly exitCode: number;
  readonly humanOutput: string;
  readonly jsonOutput: TJsonOutput;
}

class BenchmarkReportError extends Error {}

const MAX_FAILED_AMPLITUDE_DETAILS = 16;
const MAX_FAILED_EXPECTATION_DETAILS = 16;

export function benchmarkTaskCommandReport(
  report: BenchmarkTaskGradingReport
): BenchmarkCommandReport<BenchmarkTaskGradingResult> {
  return {
    exitCode: report.gradingResult.exitCode,
    humanOutput: formatBenchmarkTaskHumanOutput(report),
    jsonOutput: report.gradingResult
  };
}

export function benchmarkSuiteCommandReport(
  suite: BenchmarkSuiteGradingResult
): BenchmarkCommandReport<BenchmarkSuiteGradingResult> {
  return {
    exitCode: suite.exitCode,
    humanOutput: formatBenchmarkSuiteHumanOutput(suite),
    jsonOutput: suite
  };
}

function formatBenchmarkTaskHumanOutput(report: BenchmarkTaskGradingReport): string {
  return formatHumanResult(report.task, report.result);
}

function formatBenchmarkSuiteHumanOutput(suite: BenchmarkSuiteGradingResult): string {
  if (suite.results.length === 0 && suite.status === 'error') {
    return outputLines([
      'ERROR benchmark suite',
      ...optionalLine(suite.error, (error) => `error: ${error}`)
    ]);
  }

  return outputLines([
    `${suite.status === 'passed' ? 'PASS' : 'FAIL'} benchmark suite`,
    `tasks: ${suite.summary.total}`,
    [
      `passed: ${suite.summary.passed}`,
      `failed: ${suite.summary.failed}`,
      `disallowed: ${suite.summary.disallowed}`,
      `error: ${suite.summary.error}`
    ].join(', '),
    ...suite.results.map((item) => `- ${item.status} ${item.taskId ?? item.task} ${item.title ?? '(unavailable)'}`)
  ]);
}

function formatHumanResult(task: BenchmarkTask | undefined, result: BenchmarkResult): string {
  if (result.status === 'error') {
    return formatErrorResult(task, result);
  }

  if (!task) {
    throw new BenchmarkReportError('benchmark task is unavailable');
  }

  if (result.status === 'disallowed') {
    return formatDisallowedResult(task, result);
  }

  const label = result.status === 'passed' ? 'PASS' : 'FAIL';

  return outputLines([
    `${label} ${task.title}`,
    `checks: ${result.checks.length}`,
    ...failedCheckDetailsLines(result)
  ]);
}

function formatErrorResult(task: BenchmarkTask | undefined, result: BenchmarkResult): string {
  return outputLines([
    `ERROR ${task?.title ?? 'benchmark run'}`,
    ...optionalLine(result.errorMessage, (errorMessage) => `error: ${errorMessage}`)
  ]);
}

function failedCheckDetailsLines(result: BenchmarkResult): string[] {
  const failedChecks = result.checks
    .map((check, index) => ({ check, index }))
    .filter((item) => item.check.status === 'failed');

  if (failedChecks.length === 0) {
    return [];
  }

  return [
    'failed checks:',
    ...failedChecks.flatMap((failedCheck) => failedCheckLines(failedCheck.check, failedCheck.index))
  ];
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

function formatDisallowedResult(task: BenchmarkTask, result: BenchmarkResult): string {
  const rejected = result.disallowedSubmission?.command;

  return outputLines([
    `DISALLOWED ${task.title}`,
    ...optionalLine(rejected, (command) => `rejected: line ${command.lineNumber}: ${command.source}`),
    `allowed commands: ${task.allowedCommands.map((command) => command.source).join(', ')}`
  ]);
}

function optionalLine<T>(value: T | undefined, render: (value: T) => string): string[] {
  return value === undefined ? [] : [render(value)];
}

function outputLines(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}
