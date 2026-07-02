import { existsSync, statSync } from 'node:fs';
import path = require('node:path');

import type { CommandHandlerContext } from '../dispatcher';
import { gradeBenchmarkSuite } from '../evaluation_runner';
import { writeResearchPlotHtml } from '../research_plot';
import {
  buildResearchReport,
  formatResearchReportHumanOutput,
  readResearchTrialsForReport,
  type ResearchReport
} from '../research_report';
import {
  planResearchTrialDirectory,
  validateResearchTrialSlug,
  writeResearchTrialDirectory,
  type ResearchTrialInputPaths,
  type ResearchTrialPlan
} from '../research_trial_writer';

interface ResearchRecordRequest {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly prompt: string;
  readonly response: string;
  readonly slug: string;
  readonly submissions: string;
}

interface ResearchPlotRequest {
  readonly benchmark: string;
  readonly output: string;
}

interface ResearchRecordPlan {
  readonly inputPaths: ResearchTrialInputPaths;
  readonly trial: ResearchTrialPlan;
}

type ResearchRecordOption = keyof ResearchRecordRequest;
type ResearchPlotOption = keyof ResearchPlotRequest;

class ResearchRecordError extends Error {}

const RESEARCH_USAGE = [
  'Usage: qni research <command>',
  ''
].join('\n');
const RECORD_USAGE = [
  'Usage: qni research record --collaborator <name> --benchmark <dir> --submissions <dir> --prompt <file> --response <file> --slug <slug>',
  ''
].join('\n');
const REPORT_USAGE = [
  'Usage: qni research report [--json]',
  ''
].join('\n');
const PLOT_USAGE = [
  'Usage: qni research plot --benchmark <dir> --output <file>',
  ''
].join('\n');
const RESEARCH_HELP_TEXT = `Usage:
  qni research <command>

Commands:
  qni research record    Record one external collaborator trial for one benchmark suite.
  qni research report    Show saved research trial summaries from research/runs/
  qni research plot      Write cost per problem vs score scatter plot HTML.

Run qni research COMMAND --help for command details.`;
const RECORD_HELP_TEXT = `Usage:
  qni research record --collaborator <name> --benchmark <dir> --submissions <dir> --prompt <file> --response <file> --slug <slug>

Overview:
  Record one external collaborator trial for one benchmark suite.
  qni research record does not call AI and does not create a git commit.
  benchmark grades submissions; research saves the research log.

Required inputs:
  --collaborator <name>
  --benchmark <dir>
  --submissions <dir>
  --prompt <file>
  --response <file>
  --slug <slug>

Saved files:
  research/runs/<timestamp>-<slug>/trial.md
  research/runs/<timestamp>-<slug>/metadata.json
  research/runs/<timestamp>-<slug>/prompt.md
  research/runs/<timestamp>-<slug>/response.md
  research/runs/<timestamp>-<slug>/submissions/
  research/runs/<timestamp>-<slug>/result.json

Exit codes:
  0  passed
  1  failed
  2  disallowed
  3  error or input/save failure

Example:
  qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions tmp/submissions --prompt tmp/prompt.md --response tmp/response.md --slug smoke-claude`;
const REPORT_HELP_TEXT = `Usage:
  qni research report [--json]

Overview:
  Show a report for saved research trials under research/runs/
  By default, output is dependency-free plaintext for terminal reading.
  Use --json for the existing machine-readable report.

Output:
  summary of trial statuses
  summary of benchmark task statuses
  newest-first trial list
  invalid details when invalid research trial directories exist

Exit codes:
  0  report generated and no invalid research trials were found
  1  report generated and one or more invalid research trials were found
  3  invalid arguments or research/runs/ could not be read`;
const PLOT_HELP_TEXT = `Usage:
  qni research plot --benchmark <dir> --output <file>

Overview:
  Write a self-contained HTML scatter plot for saved research trials under research/runs/.
  The plot compares cost per problem and score percent for one benchmark.
  qni research plot reads saved metadata and does not modify research trials.

Required inputs:
  --benchmark <dir>
  --output <file>

Output:
  self-contained HTML with inline SVG
  cost per problem on the x axis
  score percent on the y axis
  exclusion counts for invalid trials, benchmark mismatches, and missing metrics

Exit codes:
  0  plot generated
  3  invalid arguments or research/runs/ could not be read`;
const OPTION_NAMES = new Map<string, ResearchRecordOption>([
  ['--benchmark', 'benchmark'],
  ['--collaborator', 'collaborator'],
  ['--prompt', 'prompt'],
  ['--response', 'response'],
  ['--slug', 'slug'],
  ['--submissions', 'submissions']
]);
const PLOT_OPTION_NAMES = new Map<string, ResearchPlotOption>([
  ['--benchmark', 'benchmark'],
  ['--output', 'output']
]);

export function runResearchCommand(argv: string[], context: CommandHandlerContext): number {
  if (isResearchParentHelpRequest(argv)) {
    process.stdout.write(`${RESEARCH_HELP_TEXT}\n`);
    return 0;
  }

  if (isResearchRecordHelpRequest(argv)) {
    process.stdout.write(`${RECORD_HELP_TEXT}\n`);
    return 0;
  }

  if (isResearchReportHelpRequest(argv)) {
    process.stdout.write(`${REPORT_HELP_TEXT}\n`);
    return 0;
  }

  if (isResearchPlotHelpRequest(argv)) {
    process.stdout.write(`${PLOT_HELP_TEXT}\n`);
    return 0;
  }

  if (isResearchReportJsonRequest(argv)) {
    return runResearchReportJson(context);
  }

  if (isResearchReportHumanRequest(argv)) {
    return runResearchReportHuman(context);
  }

  const plotRequest = parseResearchPlotRequest(argv);

  if (plotRequest) {
    return runResearchPlot(plotRequest, context);
  }

  if (isResearchPlotRequest(argv)) {
    process.stderr.write(PLOT_USAGE);
    return 3;
  }

  if (isResearchReportRequest(argv)) {
    process.stderr.write(REPORT_USAGE);
    return 3;
  }

  const request = parseResearchRecordRequest(argv);

  if (!request) {
    process.stderr.write(argv[0] === 'research' && argv[1] === 'record' ? RECORD_USAGE : RESEARCH_USAGE);
    return 3;
  }

  try {
    return recordResearchTrial(request, context);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 3;
  }
}

function isResearchParentHelpRequest(argv: readonly string[]): boolean {
  if (argv[0] !== 'research') {
    return false;
  }

  return argv.length === 1 || (argv.length === 2 && isHelpFlag(argv[1]));
}

function isResearchRecordHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'record' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchReportHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchPlotHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'plot' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchReportJsonRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 3 && argv[2] === '--json';
}

function isResearchReportHumanRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 2;
}

function isResearchReportRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report';
}

function isResearchPlotRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'plot';
}

function runResearchReport(context: CommandHandlerContext, format: (report: ResearchReport) => string): number {
  try {
    const report = buildResearchReport(readResearchTrialsForReport({ cwd: context.cwd }));

    process.stdout.write(format(report));
    return report.trialSummary.invalid > 0 ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 3;
  }
}

function runResearchReportJson(context: CommandHandlerContext): number {
  return runResearchReport(context, (report) => `${JSON.stringify(report, null, 2)}\n`);
}

function runResearchReportHuman(context: CommandHandlerContext): number {
  return runResearchReport(context, formatResearchReportHumanOutput);
}

function runResearchPlot(request: ResearchPlotRequest, context: CommandHandlerContext): number {
  try {
    const result = writeResearchPlotHtml({
      benchmark: request.benchmark,
      cwd: context.cwd,
      output: request.output
    });

    process.stdout.write(`Wrote research plot: ${result.outputPath}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 3;
  }
}

function isHelpFlag(value: string | undefined): boolean {
  return value === '--help' || value === '-h';
}

function parseResearchRecordRequest(argv: readonly string[]): ResearchRecordRequest | undefined {
  if (argv[0] !== 'research' || argv[1] !== 'record') {
    return undefined;
  }

  const values: Partial<Record<ResearchRecordOption, string>> = {};
  const args = argv.slice(2);

  if (args.length % 2 !== 0) {
    return undefined;
  }

  for (let index = 0; index < args.length; index += 2) {
    const optionName = OPTION_NAMES.get(args[index] ?? '');
    const optionValue = args[index + 1];

    if (!optionName || optionValue === undefined) {
      return undefined;
    }

    values[optionName] = optionValue;
  }

  if (
    values.benchmark === undefined ||
    values.collaborator === undefined ||
    values.prompt === undefined ||
    values.response === undefined ||
    values.slug === undefined ||
    values.submissions === undefined
  ) {
    return undefined;
  }

  return {
    benchmark: values.benchmark,
    collaborator: values.collaborator,
    prompt: values.prompt,
    response: values.response,
    slug: values.slug,
    submissions: values.submissions
  };
}

function parseResearchPlotRequest(argv: readonly string[]): ResearchPlotRequest | undefined {
  if (argv[0] !== 'research' || argv[1] !== 'plot') {
    return undefined;
  }

  const values: Partial<Record<ResearchPlotOption, string>> = {};
  const args = argv.slice(2);

  if (args.length % 2 !== 0) {
    return undefined;
  }

  for (let index = 0; index < args.length; index += 2) {
    const optionName = PLOT_OPTION_NAMES.get(args[index] ?? '');
    const optionValue = args[index + 1];

    if (!optionName || optionValue === undefined) {
      return undefined;
    }

    values[optionName] = optionValue;
  }

  if (values.benchmark === undefined || values.output === undefined) {
    return undefined;
  }

  return {
    benchmark: values.benchmark,
    output: values.output
  };
}

function recordResearchTrial(request: ResearchRecordRequest, context: CommandHandlerContext): number {
  const plan = planResearchRecord(request, context);
  const result = gradeBenchmarkSuite({
    benchmarkDir: request.benchmark,
    solutionsDir: request.submissions
  }, context);

  writeResearchTrialDirectory({
    benchmark: request.benchmark,
    collaborator: request.collaborator,
    inputPaths: plan.inputPaths,
    plan: plan.trial,
    result
  });
  process.stdout.write(`Recorded research trial: ${plan.trial.relativePath}\n`);

  return result.exitCode;
}

function planResearchRecord(request: ResearchRecordRequest, context: CommandHandlerContext): ResearchRecordPlan {
  validateResearchTrialSlug(request.slug);
  const inputPaths = validateResearchRecordInputs(request, context);
  const trial = planResearchTrialDirectory({
    cwd: context.cwd,
    destinationConflictHint: 'Choose a different --slug and run qni research record again.',
    slug: request.slug
  });

  return {
    inputPaths,
    trial
  };
}

function validateResearchRecordInputs(
  request: ResearchRecordRequest,
  context: CommandHandlerContext
): ResearchTrialInputPaths {
  requireDirectoryInput({
    inputPath: request.benchmark,
    missingMessage: `Benchmark suite directory does not exist: ${request.benchmark}`,
    optionName: '--benchmark',
    typeMessage: `Benchmark suite path is not a directory: ${request.benchmark}`
  }, context);

  return {
    prompt: requireFileInput({
      inputPath: request.prompt,
      missingMessage: `Prompt file does not exist: ${request.prompt}`,
      optionName: '--prompt',
      typeMessage: `Prompt path is not a file: ${request.prompt}`
    }, context),
    response: requireFileInput({
      inputPath: request.response,
      missingMessage: `AI response file does not exist: ${request.response}`,
      optionName: '--response',
      typeMessage: `AI response path is not a file: ${request.response}`
    }, context),
    submissions: requireDirectoryInput({
      inputPath: request.submissions,
      missingMessage: `Submissions directory does not exist: ${request.submissions}`,
      optionName: '--submissions',
      typeMessage: `Submissions path is not a directory: ${request.submissions}`
    }, context)
  };
}

function requireFileInput(options: {
  readonly inputPath: string;
  readonly missingMessage: string;
  readonly optionName: string;
  readonly typeMessage: string;
}, context: CommandHandlerContext): string {
  const resolvedPath = requireInputPath(options, context);

  if (!statSync(resolvedPath).isFile()) {
    throw new ResearchRecordError([
      options.typeMessage,
      `Pass a file path with ${options.optionName}.`
    ].join('\n'));
  }

  return resolvedPath;
}

function requireDirectoryInput(options: {
  readonly inputPath: string;
  readonly missingMessage: string;
  readonly optionName: string;
  readonly typeMessage: string;
}, context: CommandHandlerContext): string {
  const resolvedPath = requireInputPath(options, context);

  if (!statSync(resolvedPath).isDirectory()) {
    throw new ResearchRecordError([
      options.typeMessage,
      `Pass a directory path with ${options.optionName}.`
    ].join('\n'));
  }

  return resolvedPath;
}

function requireInputPath(options: {
  readonly inputPath: string;
  readonly missingMessage: string;
  readonly optionName: string;
}, context: CommandHandlerContext): string {
  const resolvedPath = resolveInputPath(options.inputPath, context);

  if (!existsSync(resolvedPath)) {
    const kind = options.optionName === '--prompt' || options.optionName === '--response' ? 'file' : 'directory';

    throw new ResearchRecordError([
      options.missingMessage,
      `Create the ${kind} or pass a different ${options.optionName} path.`
    ].join('\n'));
  }

  return resolvedPath;
}

function resolveInputPath(filePath: string, context: CommandHandlerContext): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  const cwdPath = path.resolve(context.cwd, filePath);

  return existsSync(cwdPath) ? cwdPath : path.resolve(context.projectRoot, filePath);
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}

