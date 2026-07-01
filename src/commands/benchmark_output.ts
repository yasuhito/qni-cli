import type { BenchmarkTask, ComplexAmplitude } from '../evaluation_runner/benchmark_task';
import type {
  AmplitudeMismatch,
  BenchmarkCheckResult,
  BenchmarkGradingCaseResult,
  BenchmarkResult,
  BenchmarkSuiteGradingResult,
  BenchmarkSuiteTaskGradingResult,
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
    ...suite.results.flatMap(formatBenchmarkSuiteTaskLines)
  ]);
}

function formatBenchmarkSuiteTaskLines(item: BenchmarkSuiteTaskGradingResult): string[] {
  return [
    `- ${item.status} ${item.taskId ?? item.task} ${item.title ?? '(unavailable)'}`,
    ...suiteTaskFailedCheckLines(item)
  ];
}

function suiteTaskFailedCheckLines(item: BenchmarkSuiteTaskGradingResult): string[] {
  return item.gradingCases?.flatMap((gradingCase) => gradingCase.checks
    .map((check, index) => ({ caseId: gradingCase.caseId, check, index }))
    .filter((entry) => entry.check.status === 'failed')
    .map((entry) => `  - case ${entry.caseId} ${entry.check.type} #${entry.index + 1}: failed`)) ?? [];
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
  if (result.gradingCases) {
    return failedGradingCaseDetailsLines(result.gradingCases);
  }

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

function failedGradingCaseDetailsLines(gradingCases: readonly BenchmarkGradingCaseResult[]): string[] {
  const failedChecks = gradingCases.flatMap((gradingCase) => gradingCase.checks
    .map((check, index) => ({ caseId: gradingCase.caseId, check, index }))
    .filter((item) => item.check.status === 'failed'));

  if (failedChecks.length === 0) {
    return [];
  }

  return [
    'failed checks:',
    ...failedChecks.flatMap((failedCheck) => failedCheckLines(
      failedCheck.check,
      failedCheck.index,
      failedCheck.caseId
    ))
  ];
}

function failedCheckLines(check: BenchmarkCheckResult, index: number, caseId?: string): string[] {
  switch (check.type) {
    case 'expect':
      return failedExpectationCheckLines(check, index, caseId);
    case 'run':
      return failedRunCheckLines(check, index, caseId);
  }
}

function failedRunCheckLines(check: RunCheckResult, index: number, caseId?: string): string[] {
  return [
    `- ${failedCheckLabel(check, index, caseId)}: state vector did not match expected amplitudes`,
    '  expected / actual mismatches:',
    ...displayedAmplitudeMismatches(check.mismatches.displayed),
    ...omittedAmplitudeMismatchLines(check.mismatches.omittedCount)
  ];
}

function failedExpectationCheckLines(check: ExpectCheckResult, index: number, caseId?: string): string[] {
  return [
    `- ${failedCheckLabel(check, index, caseId)}: expectation values did not match expected values`,
    '  expected / actual mismatches:',
    ...displayedExpectationMismatches(check.mismatches.displayed),
    ...omittedExpectationMismatchLines(check.mismatches.omittedCount)
  ];
}

function failedCheckLabel(check: BenchmarkCheckResult, index: number, caseId: string | undefined): string {
  const checkLabel = `${check.type} #${index + 1}`;

  return caseId === undefined ? checkLabel : `case ${caseId} ${checkLabel}`;
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
