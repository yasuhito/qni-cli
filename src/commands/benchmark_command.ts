import type { CommandHandlerContext } from '../dispatcher';
import {
  gradeBenchmarkSuite,
  gradeBenchmarkTaskForReport
} from '../evaluation_runner';
import {
  benchmarkSuiteCommandReport,
  benchmarkTaskCommandReport,
  type BenchmarkCommandReport
} from './benchmark_output';

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

const USAGE = [
  'Usage: qni benchmark run <task-file> <submission-file> [--json]',
  '       qni benchmark run-all <benchmark-dir> <solutions-dir> [--json]',
  ''
].join('\n');

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
  const report = benchmarkTaskCommandReport(gradeBenchmarkTaskForReport({
    submissionFile: request.submissionFile,
    taskFile: request.taskFile
  }, context));

  writeBenchmarkReport(report, request.format);
  return report.exitCode;
}

function runBenchmarkSuite(request: BenchmarkSuiteRequest, context: CommandHandlerContext): number {
  const report = benchmarkSuiteCommandReport(gradeBenchmarkSuite({
    benchmarkDir: request.benchmarkDir,
    solutionsDir: request.solutionsDir
  }, context));

  writeBenchmarkReport(report, request.format);
  return report.exitCode;
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

function writeBenchmarkReport(report: BenchmarkCommandReport<unknown>, format: BenchmarkOutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(report.jsonOutput, null, 2)}\n`);
    return;
  }

  process.stdout.write(report.humanOutput);
}
