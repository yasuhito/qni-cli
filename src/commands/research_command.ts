import { copyFileSync, cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path = require('node:path');

import type { CommandHandlerContext } from '../dispatcher';
import { gradeBenchmarkSuite, type BenchmarkSuiteGradingResult } from '../evaluation_runner';
import {
  buildResearchReport,
  formatResearchReportHumanOutput,
  readResearchTrialsForReport,
  type ResearchReport
} from '../research_report';

interface ResearchRecordRequest {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly prompt: string;
  readonly response: string;
  readonly slug: string;
  readonly submissions: string;
}

interface ResearchRecordInputPaths {
  readonly prompt: string;
  readonly response: string;
  readonly submissions: string;
}

interface ResearchRecordPlan {
  readonly createdAt: Date;
  readonly id: string;
  readonly inputPaths: ResearchRecordInputPaths;
  readonly trialDir: string;
}

type ResearchRecordOption = keyof ResearchRecordRequest;

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
const RESEARCH_HELP_TEXT = `Usage:
  qni research <command>

Commands:
  qni research record    Record one external collaborator trial for one benchmark suite.
  qni research report    Show saved research trial summaries from research/runs/.

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
  Show a report for saved research trials under research/runs/.
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
  3  research/runs/ could not be read`;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const OPTION_NAMES = new Map<string, ResearchRecordOption>([
  ['--benchmark', 'benchmark'],
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

  if (isResearchReportHelpRequest(argv)) {
    process.stdout.write(`${REPORT_HELP_TEXT}\n`);
    return 0;
  }

  if (isResearchReportJsonRequest(argv)) {
    return runResearchReportJson(context);
  }

  if (isResearchReportHumanRequest(argv)) {
    return runResearchReportHuman(context);
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

function isResearchReportJsonRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 3 && argv[2] === '--json';
}

function isResearchReportHumanRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report' && argv.length === 2;
}

function isResearchReportRequest(argv: readonly string[]): boolean {
  return argv[0] === 'research' && argv[1] === 'report';
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

function recordResearchTrial(request: ResearchRecordRequest, context: CommandHandlerContext): number {
  const plan = planResearchRecord(request, context);
  const result = gradeBenchmarkSuite({
    benchmarkDir: request.benchmark,
    solutionsDir: request.submissions
  }, context);

  mkdirSync(path.dirname(plan.trialDir), { recursive: true });
  mkdirSync(plan.trialDir);
  copyFileSync(plan.inputPaths.prompt, path.join(plan.trialDir, 'prompt.md'));
  copyFileSync(plan.inputPaths.response, path.join(plan.trialDir, 'response.md'));
  cpSync(plan.inputPaths.submissions, path.join(plan.trialDir, 'submissions'), { recursive: true });
  writeJsonFile(path.join(plan.trialDir, 'result.json'), result);
  writeJsonFile(path.join(plan.trialDir, 'metadata.json'), researchMetadata({
    createdAt: plan.createdAt,
    id: plan.id,
    request,
    result
  }));
  writeFileSync(path.join(plan.trialDir, 'trial.md'), researchTrialSummary(request, result));
  process.stdout.write(`Recorded research trial: ${toPosixPath(path.join('research', 'runs', plan.id))}\n`);

  return result.exitCode;
}

function planResearchRecord(request: ResearchRecordRequest, context: CommandHandlerContext): ResearchRecordPlan {
  validateResearchSlug(request.slug);
  const inputPaths = validateResearchRecordInputs(request, context);
  const createdAt = currentUtcSecond();
  const id = `${researchTimestamp(createdAt)}-${request.slug}`;
  const trialDir = path.join(context.cwd, 'research', 'runs', id);

  validateResearchTrialDestination(trialDir, context);

  return {
    createdAt,
    id,
    inputPaths,
    trialDir
  };
}

function validateResearchSlug(slug: string): void {
  if (SLUG_PATTERN.test(slug)) {
    return;
  }

  throw new ResearchRecordError([
    `Invalid --slug: ${slug}`,
    'Use lowercase letters, digits, and hyphens between words (pattern: [a-z0-9]+(-[a-z0-9]+)*).'
  ].join('\n'));
}

function validateResearchRecordInputs(
  request: ResearchRecordRequest,
  context: CommandHandlerContext
): ResearchRecordInputPaths {
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

function validateResearchTrialDestination(trialDir: string, context: CommandHandlerContext): void {
  if (!existsSync(trialDir)) {
    return;
  }

  throw new ResearchRecordError([
    `Research trial directory already exists: ${toPosixPath(path.relative(context.cwd, trialDir))}`,
    'Choose a different --slug and run qni research record again.'
  ].join('\n'));
}

function currentUtcSecond(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

function researchTimestamp(date: Date): string {
  const iso = date.toISOString();

  return `${iso.slice(0, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function researchMetadata(options: {
  readonly createdAt: Date;
  readonly id: string;
  readonly request: ResearchRecordRequest;
  readonly result: BenchmarkSuiteGradingResult;
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: options.id,
    createdAt: options.createdAt.toISOString(),
    collaborator: options.request.collaborator,
    benchmark: options.request.benchmark,
    submissions: 'submissions',
    prompt: 'prompt.md',
    response: 'response.md',
    result: 'result.json',
    status: options.result.status
  };
}

function researchTrialSummary(request: ResearchRecordRequest, result: BenchmarkSuiteGradingResult): string {
  return [
    `# Research trial: ${request.slug}`,
    '',
    `- collaborator: ${request.collaborator}`,
    `- benchmark: ${request.benchmark}`,
    `- status: ${result.status}`,
    `- tasks: ${result.summary.total}`,
    `- passed: ${result.summary.passed}`,
    `- failed: ${result.summary.failed}`,
    `- disallowed: ${result.summary.disallowed}`,
    `- error: ${result.summary.error}`,
    '',
    '## Files',
    '',
    '- Prompt: ./prompt.md',
    '- Response: ./response.md',
    '- Submissions: ./submissions/',
    '- Result: ./result.json',
    ''
  ].join('\n');
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
