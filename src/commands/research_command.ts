import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');

import type { CommandHandlerContext } from '../dispatcher';
import { gradeBenchmarkSuite, type BenchmarkSuiteGradingResult } from '../evaluation_runner';
import { writeNeutralCircuitJsonDirectoryAsQniSubmissions } from '../evaluation_runner/neutral_circuit_json_submission';
import { buildResearchCompare, formatResearchCompareHumanOutput, type ResearchCompare } from '../research_compare';
import { writeResearchPlotHtml } from '../research_plot';
import {
  buildResearchReport,
  formatResearchReportHumanOutput,
  readResearchTrialsForReport,
  type ResearchReport
} from '../research_report';
import {
  RESEARCH_THINKING_LEVELS,
  solveResearchTrial,
  type ResearchSolveRequest,
  type ResearchThinking
} from '../research_solver';
import {
  planResearchTrialDirectory,
  validateResearchTrialSlug,
  writeResearchTrialDirectory,
  type ResearchTrialInputPaths,
  type ResearchTrialPlan
} from '../research_trial_writer';

interface ResearchRecordRequest {
  readonly benchmark: string;
  readonly circuitJsonDir?: string;
  readonly collaborator: string;
  readonly prompt: string;
  readonly response: string;
  readonly slug: string;
  readonly submissions?: string;
}

interface ResearchPlotRequest {
  readonly benchmark: string;
  readonly output: string;
  readonly tasks: readonly string[];
}

interface ResearchCompareRequest {
  readonly benchmark: string;
  readonly json: boolean;
  readonly tasks: readonly string[];
}

interface ResearchRecordInputPaths {
  readonly benchmark: string;
  readonly circuitJsonDir?: string;
  readonly prompt: string;
  readonly response: string;
  readonly submissions?: string;
}

interface ResearchRecordPreparedSubmissionInput {
  readonly inputPaths: ResearchTrialInputPaths;
  readonly result: BenchmarkSuiteGradingResult;
  readonly submissionProtocol: SubmissionProtocol;
  readonly temporarySubmissionsDir?: string;
}

interface ResearchRecordPlan {
  readonly inputPaths: ResearchRecordInputPaths;
  readonly trial: ResearchTrialPlan;
}

type SubmissionProtocol = 'blind-neutral-circuit-json-v1' | 'qni-command-output-v0';

type ResearchRecordOption = keyof ResearchRecordRequest;

class ResearchRecordError extends Error {}

const RESEARCH_USAGE = [
  'Usage: qni research <command>',
  ''
].join('\n');
const RECORD_USAGE = [
  'Usage: qni research record --collaborator <name> --benchmark <dir> (--submissions <dir> | --circuit-json-dir <dir>) --prompt <file> --response <file> --slug <slug>',
  ''
].join('\n');
const SOLVE_USAGE = [
  'Usage: qni research solve --model <pi-model-id> --thinking <level> --benchmark <dir> [--task <task-id> ...] --slug <slug>',
  ''
].join('\n');
const REPORT_USAGE = [
  'Usage: qni research report [--json]',
  ''
].join('\n');
const PLOT_USAGE = [
  'Usage: qni research plot --benchmark <dir> [--task <task-id> ...] --output <file>',
  ''
].join('\n');
const COMPARE_USAGE = [
  'Usage: qni research compare --benchmark <dir> [--task <task-id> ...] [--json]',
  ''
].join('\n');
const RESEARCH_HELP_TEXT = `Usage:
  qni research <command>

Commands:
  qni research record    Record one external collaborator trial for one benchmark suite.
  qni research solve     Run one Pi model against one benchmark suite.
  qni research report    Show saved research trial summaries from research/runs/
  qni research plot      Write cost per problem vs score scatter plot HTML.
  qni research compare   Compare saved research trials task by task.

Run qni research COMMAND --help for command details.`;
const RECORD_HELP_TEXT = `Usage:
  qni research record --collaborator <name> --benchmark <dir> (--submissions <dir> | --circuit-json-dir <dir>) --prompt <file> --response <file> --slug <slug>

Overview:
  Record one external collaborator trial for one benchmark suite.
  qni research record does not call AI and does not create a git commit.
  benchmark grades submissions; research saves the research log.

Required inputs:
  --collaborator <name>
  --benchmark <dir>
  one of --submissions <dir> or --circuit-json-dir <dir>
  --prompt <file>
  --response <file>
  --slug <slug>

Saved files:
  research/runs/<timestamp>-<slug>/trial.md
  research/runs/<timestamp>-<slug>/metadata.json
  research/runs/<timestamp>-<slug>/prompt.md
  research/runs/<timestamp>-<slug>/response.md
  research/runs/<timestamp>-<slug>/submissions/
  research/runs/<timestamp>-<slug>/circuit-json/  (when --circuit-json-dir is used)
  research/runs/<timestamp>-<slug>/result.json

Exit codes:
  0  passed
  1  failed
  2  disallowed
  3  error or input/save failure

Example:
  qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions tmp/submissions --prompt tmp/prompt.md --response tmp/response.md --slug smoke-claude
  qni research record --collaborator external-agent --benchmark benchmarks/quantum-katas --circuit-json-dir tmp/circuit-json --prompt tmp/prompt.md --response tmp/response.md --slug neutral-json`;
const SOLVE_HELP_TEXT = `Usage:
  qni research solve --model <pi-model-id> --thinking <level> --benchmark <dir> [--task <task-id> ...] --slug <slug>

Overview:
  Run one model through a fresh, tool-free Pi process for each benchmark task.
  It saves prompts, final responses, neutral circuit JSON, converted submissions, Pi usage, reported cost, and grading output.

Required inputs:
  --model <pi-model-id>
  --thinking <off|minimal|low|medium|high|xhigh|max>
  --benchmark <dir>
  --slug <slug>

Options:
  --task <task-id>  Select one task. Repeat to select multiple tasks.

Saved files:
  research/runs/<timestamp>-<slug>/trial.md
  research/runs/<timestamp>-<slug>/metadata.json
  research/runs/<timestamp>-<slug>/prompt.md
  research/runs/<timestamp>-<slug>/response.md
  research/runs/<timestamp>-<slug>/prompts/
  research/runs/<timestamp>-<slug>/responses/
  research/runs/<timestamp>-<slug>/circuit-json/
  research/runs/<timestamp>-<slug>/submissions/
  research/runs/<timestamp>-<slug>/calls.json
  research/runs/<timestamp>-<slug>/result.json

Exit codes:
  0  passed
  1  failed
  2  disallowed
  3  error or input/save/Pi failure`;
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
  qni research plot --benchmark <dir> [--task <task-id> ...] --output <file>

Overview:
  Write a self-contained HTML scatter plot for saved research trials under research/runs/.
  The plot compares cost per problem and score percent for one benchmark.
  qni research plot reads saved metadata and does not modify research trials.

Required inputs:
  --benchmark <dir>
  --output <file>

Options:
  --task <task-id>  Select one task set. Repeat to select multiple tasks.

Output:
  self-contained HTML with inline SVG
  cost per problem on the x axis
  score percent on the y axis
  exclusion counts for invalid trials, benchmark mismatches, task set mismatches, and missing metrics

Exit codes:
  0  plot generated
  3  invalid arguments or research/runs/ could not be read`;
const COMPARE_HELP_TEXT = `Usage:
  qni research compare --benchmark <dir> [--task <task-id> ...] [--json]

Overview:
  Compare saved research trials under research/runs/ for one benchmark.
  qni research compare reads saved research logs only. It does not call AI, regrade submissions, or modify research trials.

Required inputs:
  --benchmark <dir>

Options:
  --task <task-id>  Select one task set. Repeat to select multiple tasks.
  --json  Print the machine-readable comparison instead of plaintext.

Output:
  included trial scores
  task-by-trial status matrix
  tasks whose status differs between trials
  warnings for mixed submission protocols
  exclusion counts for invalid trials, benchmark mismatches, task set mismatches, and missing result details

Exit codes:
  0  comparison generated and no invalid research trials were found
  1  comparison generated and one or more invalid research trials were found
  3  invalid arguments or research/runs/ could not be read`;
const RECORD_OPTION_NAMES = new Map<string, ResearchRecordOption>([
  ['--benchmark', 'benchmark'],
  ['--circuit-json-dir', 'circuitJsonDir'],
  ['--collaborator', 'collaborator'],
  ['--prompt', 'prompt'],
  ['--response', 'response'],
  ['--slug', 'slug'],
  ['--submissions', 'submissions']
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

  if (isResearchSolveHelpRequest(argv)) {
    process.stdout.write(`${SOLVE_HELP_TEXT}\n`);
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

  if (isResearchCompareHelpRequest(argv)) {
    process.stdout.write(`${COMPARE_HELP_TEXT}\n`);
    return 0;
  }

  const compareRequest = parseResearchCompareRequest(argv);

  if (compareRequest) {
    return runResearchCompare(compareRequest, context);
  }

  if (isResearchCompareRequest(argv)) {
    process.stderr.write(COMPARE_USAGE);
    return 3;
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

  const solveRequest = parseResearchSolveRequest(argv);

  if (solveRequest) {
    try {
      return solveResearchTrial(solveRequest, context);
    } catch (error) {
      process.stderr.write(`${errorMessage(error)}\n`);
      return 3;
    }
  }

  if (isResearchSolveRequest(argv)) {
    process.stderr.write(SOLVE_USAGE);
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

function isResearchSolveHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'solve' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchReportHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchPlotHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'plot' && argv.length === 3 && isHelpFlag(argv[2]);
}

function isResearchCompareHelpRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'compare' && argv.length === 3 && isHelpFlag(argv[2]);
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

function isResearchSolveRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'solve';
}

function isResearchPlotRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'plot';
}

function isResearchCompareRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'compare';
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
      output: request.output,
      taskSelection: request.tasks
    });

    process.stdout.write(`Wrote research plot: ${result.outputPath}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 3;
  }
}

function runResearchCompare(request: ResearchCompareRequest, context: CommandHandlerContext): number {
  return runResearchCompareWithFormat(request, context, (compare) => (
    request.json ? `${JSON.stringify(compare, null, 2)}\n` : formatResearchCompareHumanOutput(compare)
  ));
}

function runResearchCompareWithFormat(
  request: ResearchCompareRequest,
  context: CommandHandlerContext,
  format: (compare: ResearchCompare) => string
): number {
  try {
    const compare = buildResearchCompare({
      benchmark: request.benchmark,
      cwd: context.cwd,
      taskSelection: request.tasks
    });

    process.stdout.write(format(compare));
    return compare.exclusions.invalidTrial > 0 ? 1 : 0;
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

  const values = parseOptionValues<ResearchRecordOption>(argv.slice(2), RECORD_OPTION_NAMES);

  if (!values ||
    values.benchmark === undefined ||
    values.collaborator === undefined ||
    values.prompt === undefined ||
    values.response === undefined ||
    values.slug === undefined
  ) {
    return undefined;
  }

  return {
    benchmark: values.benchmark,
    ...(values.circuitJsonDir === undefined ? {} : { circuitJsonDir: values.circuitJsonDir }),
    collaborator: values.collaborator,
    prompt: values.prompt,
    response: values.response,
    slug: values.slug,
    ...(values.submissions === undefined ? {} : { submissions: values.submissions })
  };
}

function parseResearchSolveRequest(argv: readonly string[]): ResearchSolveRequest | undefined {
  if (argv[0] !== 'research' || argv[1] !== 'solve') return undefined;
  const parsed = parseRepeatableTaskOptions(argv.slice(2), new Set(['--benchmark', '--model', '--thinking', '--slug']));
  if (!parsed) return undefined;
  const benchmark = parsed.values.get('--benchmark');
  const model = parsed.values.get('--model');
  const slug = parsed.values.get('--slug');
  const thinking = parsed.values.get('--thinking');
  if (!benchmark || !model || !slug || !isResearchThinking(thinking)) return undefined;
  return { benchmark, model, slug, thinking, tasks: parsed.tasks };
}

function parseResearchPlotRequest(argv: readonly string[]): ResearchPlotRequest | undefined {
  if (argv[0] !== 'research' || argv[1] !== 'plot') return undefined;
  const parsed = parseRepeatableTaskOptions(argv.slice(2), new Set(['--benchmark', '--output']));
  if (!parsed) return undefined;
  const benchmark = parsed.values.get('--benchmark');
  const output = parsed.values.get('--output');
  return benchmark && output ? { benchmark, output, tasks: parsed.tasks } : undefined;
}

function parseResearchCompareRequest(argv: readonly string[]): ResearchCompareRequest | undefined {
  if (argv[0] !== 'research' || argv[1] !== 'compare') return undefined;
  const parsed = parseRepeatableTaskOptions(
    argv.slice(2),
    new Set(['--benchmark']),
    new Set(['--json'])
  );
  if (!parsed) return undefined;
  const benchmark = parsed.values.get('--benchmark');
  return benchmark ? { benchmark, json: parsed.flags.has('--json'), tasks: parsed.tasks } : undefined;
}

function parseRepeatableTaskOptions(
  args: readonly string[],
  uniqueOptions: ReadonlySet<string>,
  standaloneOptions: ReadonlySet<string> = new Set()
): {
  readonly flags: ReadonlySet<string>;
  readonly tasks: readonly string[];
  readonly values: ReadonlyMap<string, string>;
} | undefined {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const tasks: string[] = [];

  for (let index = 0; index < args.length;) {
    const name = args[index];
    if (!name) return undefined;

    if (standaloneOptions.has(name)) {
      if (flags.has(name)) return undefined;
      flags.add(name);
      index += 1;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) return undefined;
    if (name === '--task') {
      if (tasks.includes(value)) return undefined;
      tasks.push(value);
      index += 2;
      continue;
    }
    if (!uniqueOptions.has(name) || values.has(name)) return undefined;
    values.set(name, value);
    index += 2;
  }

  return { flags, tasks: [...tasks].sort(), values };
}

function isResearchThinking(value: string | undefined): value is ResearchThinking {
  return RESEARCH_THINKING_LEVELS.some((level) => level === value);
}

function parseOptionValues<OptionName extends string>(
  args: readonly string[],
  optionNames: ReadonlyMap<string, OptionName>
): Partial<Record<OptionName, string>> | undefined {
  const values: Partial<Record<OptionName, string>> = {};

  if (args.length % 2 !== 0) {
    return undefined;
  }

  for (let index = 0; index < args.length; index += 2) {
    const optionName = optionNames.get(args[index] ?? '');
    const optionValue = args[index + 1];

    if (!optionName || optionValue === undefined) {
      return undefined;
    }

    values[optionName] = optionValue;
  }

  return values;
}

function recordResearchTrial(request: ResearchRecordRequest, context: CommandHandlerContext): number {
  const plan = planResearchRecord(request, context);
  const preparedInput = prepareResearchRecordSubmissionInput({ context, plan, request });

  try {
    writeResearchTrialDirectory({
      benchmark: request.benchmark,
      collaborator: request.collaborator,
      inputPaths: preparedInput.inputPaths,
      metadata: {
        submissionProtocol: preparedInput.submissionProtocol
      },
      plan: plan.trial,
      result: preparedInput.result
    });
    process.stdout.write(`Recorded research trial: ${plan.trial.relativePath}\n`);

    return preparedInput.result.exitCode;
  } finally {
    cleanupPreparedResearchRecordSubmissionInput(preparedInput);
  }
}

function prepareResearchRecordSubmissionInput(options: {
  readonly context: CommandHandlerContext;
  readonly plan: ResearchRecordPlan;
  readonly request: ResearchRecordRequest;
}): ResearchRecordPreparedSubmissionInput {
  if (options.plan.inputPaths.submissions) {
    return {
      inputPaths: {
        prompt: options.plan.inputPaths.prompt,
        response: options.plan.inputPaths.response,
        submissions: options.plan.inputPaths.submissions
      },
      result: gradeBenchmarkSuite({
        benchmarkDir: options.request.benchmark,
        solutionsDir: options.request.submissions ?? ''
      }, options.context),
      submissionProtocol: 'qni-command-output-v0'
    };
  }

  return prepareNeutralCircuitJsonRecordSubmissionInput(options);
}

function prepareNeutralCircuitJsonRecordSubmissionInput(options: {
  readonly context: CommandHandlerContext;
  readonly plan: ResearchRecordPlan;
  readonly request: ResearchRecordRequest;
}): ResearchRecordPreparedSubmissionInput {
  if (!options.plan.inputPaths.circuitJsonDir) {
    throw new ResearchRecordError('Internal error: missing validated --circuit-json-dir path.');
  }

  const temporarySubmissionsDir = mkdtempSync(path.join(tmpdir(), 'qni-research-record-submissions-'));

  try {
    const conversion = writeNeutralCircuitJsonDirectoryAsQniSubmissions({
      benchmarkDirPath: options.plan.inputPaths.benchmark,
      circuitJsonDirPath: options.plan.inputPaths.circuitJsonDir,
      outputDirPath: temporarySubmissionsDir
    });
    const result = rewriteNeutralCircuitJsonSubmissionPaths(gradeBenchmarkSuite({
      benchmarkDir: options.request.benchmark,
      solutionsDir: temporarySubmissionsDir
    }, options.context), conversion.relativeSubmissionFiles);

    return {
      inputPaths: {
        circuitJson: options.plan.inputPaths.circuitJsonDir,
        prompt: options.plan.inputPaths.prompt,
        response: options.plan.inputPaths.response,
        submissions: temporarySubmissionsDir
      },
      result,
      submissionProtocol: 'blind-neutral-circuit-json-v1',
      temporarySubmissionsDir
    };
  } catch (error) {
    rmSync(temporarySubmissionsDir, { force: true, recursive: true });
    throw error;
  }
}

function rewriteNeutralCircuitJsonSubmissionPaths(
  result: BenchmarkSuiteGradingResult,
  relativeSubmissionFiles: readonly string[]
): BenchmarkSuiteGradingResult {
  return {
    ...result,
    results: result.results.map((item, index) => ({
      ...item,
      submission: relativeSubmissionFiles[index]
        ? toPosixPath(path.join('submissions', relativeSubmissionFiles[index]))
        : item.submission
    }))
  };
}

function cleanupPreparedResearchRecordSubmissionInput(input: ResearchRecordPreparedSubmissionInput): void {
  if (input.temporarySubmissionsDir) {
    rmSync(input.temporarySubmissionsDir, { force: true, recursive: true });
  }
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
): ResearchRecordInputPaths {
  validateResearchRecordSubmissionSource(request);

  const benchmark = requireDirectoryInput({
    inputPath: request.benchmark,
    missingMessage: `Benchmark suite directory does not exist: ${request.benchmark}`,
    optionName: '--benchmark',
    typeMessage: `Benchmark suite path is not a directory: ${request.benchmark}`
  }, context);
  const prompt = requireFileInput({
    inputPath: request.prompt,
    missingMessage: `Prompt file does not exist: ${request.prompt}`,
    optionName: '--prompt',
    typeMessage: `Prompt path is not a file: ${request.prompt}`
  }, context);
  const response = requireFileInput({
    inputPath: request.response,
    missingMessage: `AI response file does not exist: ${request.response}`,
    optionName: '--response',
    typeMessage: `AI response path is not a file: ${request.response}`
  }, context);

  if (request.submissions !== undefined) {
    return {
      benchmark,
      prompt,
      response,
      submissions: requireDirectoryInput({
        inputPath: request.submissions,
        missingMessage: `Submissions directory does not exist: ${request.submissions}`,
        optionName: '--submissions',
        typeMessage: `Submissions path is not a directory: ${request.submissions}`
      }, context)
    };
  }

  if (request.circuitJsonDir !== undefined) {
    return {
      benchmark,
      circuitJsonDir: requireDirectoryInput({
        inputPath: request.circuitJsonDir,
        missingMessage: `Circuit JSON directory does not exist: ${request.circuitJsonDir}`,
        optionName: '--circuit-json-dir',
        typeMessage: `Circuit JSON path is not a directory: ${request.circuitJsonDir}`
      }, context),
      prompt,
      response
    };
  }

  throw new ResearchRecordError('Internal error: missing submission input after validation.');
}

function validateResearchRecordSubmissionSource(request: ResearchRecordRequest): void {
  const sourceCount = [request.submissions, request.circuitJsonDir]
    .filter((value) => value !== undefined).length;

  if (sourceCount === 1) {
    return;
  }

  if (sourceCount === 0) {
    throw new ResearchRecordError([
      'Specify exactly one submission input: --submissions or --circuit-json-dir.',
      'Pass --submissions <dir> for .qni submissions or --circuit-json-dir <dir> for neutral circuit JSON submissions.'
    ].join('\n'));
  }

  throw new ResearchRecordError([
    'Specify exactly one submission input: --submissions or --circuit-json-dir.',
    'Remove one of --submissions or --circuit-json-dir.'
  ].join('\n'));
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

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}

