import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path = require('node:path');

import type { CommandHandlerContext } from '../dispatcher';
import { gradeBenchmarkSuite, type BenchmarkSuiteGradingResult } from './benchmark_command';

interface ResearchRecordRequest {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly prompt: string;
  readonly response: string;
  readonly slug: string;
  readonly submissions: string;
}

type ResearchRecordOption = keyof ResearchRecordRequest;

const USAGE = [
  'Usage: qni research record --collaborator <name> --benchmark <dir> --submissions <dir> --prompt <file> --response <file> --slug <slug>',
  ''
].join('\n');
const OPTION_NAMES = new Map<string, ResearchRecordOption>([
  ['--benchmark', 'benchmark'],
  ['--collaborator', 'collaborator'],
  ['--prompt', 'prompt'],
  ['--response', 'response'],
  ['--slug', 'slug'],
  ['--submissions', 'submissions']
]);

export function runResearchCommand(argv: string[], context: CommandHandlerContext): number {
  const request = parseResearchRecordRequest(argv);

  if (!request) {
    process.stderr.write(USAGE);
    return 3;
  }

  try {
    return recordResearchTrial(request, context);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 3;
  }
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

  if (!values.benchmark || !values.collaborator || !values.prompt || !values.response || !values.slug || !values.submissions) {
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
  const result = gradeBenchmarkSuite({
    benchmarkDir: request.benchmark,
    solutionsDir: request.submissions
  }, context);

  if (result.status !== 'passed') {
    return result.exitCode;
  }

  const createdAt = currentUtcSecond();
  const id = `${researchTimestamp(createdAt)}-${request.slug}`;
  const trialDir = path.join(context.cwd, 'research', 'runs', id);

  mkdirSync(path.dirname(trialDir), { recursive: true });
  mkdirSync(trialDir);
  copyFileSync(resolveInputPath(request.prompt, context), path.join(trialDir, 'prompt.md'));
  copyFileSync(resolveInputPath(request.response, context), path.join(trialDir, 'response.md'));
  cpSync(resolveInputPath(request.submissions, context), path.join(trialDir, 'submissions'), { recursive: true });
  writeJsonFile(path.join(trialDir, 'result.json'), result);
  writeJsonFile(path.join(trialDir, 'metadata.json'), researchMetadata({
    createdAt,
    id,
    request,
    result
  }));
  writeFileSync(path.join(trialDir, 'trial.md'), researchTrialSummary(request, result));
  process.stdout.write(`Recorded research trial: ${toPosixPath(path.join('research', 'runs', id))}\n`);

  return 0;
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
