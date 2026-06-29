import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');

import type { CommandHandler, CommandHandlerContext } from '../dispatcher';
import { runAddCommand } from './add_command';
import { runRunCommand } from './run_command';

interface BenchmarkTask {
  readonly allowedCommands: readonly AllowedCommand[];
  readonly checks: BenchmarkChecks;
  readonly id: string;
  readonly title: string;
}

interface AllowedCommand {
  readonly argv: readonly string[];
  readonly source: string;
}

interface BenchmarkChecks {
  readonly items: readonly RunCheck[];
  readonly tolerance: number;
}

interface RunCheck {
  readonly expected: readonly ExpectedAmplitude[];
  readonly type: 'run';
}

interface ExpectedAmplitude {
  readonly amplitude: ComplexAmplitude;
  readonly basis: string;
}

interface ExpectedStateVector {
  readonly amplitudes: ReadonlyMap<number, ComplexAmplitude>;
  readonly vectorLength: number;
}

interface BasisMetadata {
  readonly index: number;
  readonly vectorLength: number;
}

interface ComplexAmplitude {
  readonly imaginary: number;
  readonly real: number;
}

interface QniCommandResult {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface SubmissionCommand {
  readonly argv: string[];
  readonly lineNumber: number;
  readonly source: string;
}

interface DisallowedSubmission {
  readonly command: SubmissionCommand;
}

type BenchmarkOutputFormat = 'human' | 'json';

type BenchmarkStatus = 'passed' | 'failed' | 'disallowed' | 'error';

interface BenchmarkRequest {
  readonly format: BenchmarkOutputFormat;
  readonly submissionFile: string;
  readonly taskFile: string;
}

interface BenchmarkResult {
  readonly checks: readonly BenchmarkCheckResult[];
  readonly disallowedSubmission?: DisallowedSubmission;
  readonly errorMessage?: string;
  readonly status: BenchmarkStatus;
}

interface BenchmarkCheckResult {
  readonly mismatches: MismatchSummary;
  readonly status: 'passed' | 'failed';
  readonly type: 'run';
}

interface MismatchSummary {
  readonly displayed: readonly AmplitudeMismatch[];
  readonly omittedCount: number;
}

interface AmplitudeMismatch {
  readonly actual: ComplexAmplitude;
  readonly basis: string;
  readonly expected: ComplexAmplitude;
}

class BenchmarkError extends Error {}

const QNI_COMMAND_HANDLERS = new Map<string, CommandHandler>([
  ['add', runAddCommand],
  ['run', runRunCommand]
]);
const USAGE = 'Usage: qni benchmark run <task-file> <submission-file> [--json]\n';
const MAX_FAILED_AMPLITUDE_DETAILS = 16;
const ZERO_AMPLITUDE: ComplexAmplitude = { imaginary: 0, real: 0 };

export function runBenchmarkCommand(argv: string[], context: CommandHandlerContext): number {
  const request = parseBenchmarkRequest(argv);

  if (!request) {
    process.stderr.write(USAGE);
    return 3;
  }

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

    writeBenchmarkResult({
      format: request.format,
      result,
      submission: request.submissionFile,
      task
    });
    return exitCodeForResult(result);
  } catch (error) {
    const result: BenchmarkResult = {
      checks: [],
      errorMessage: errorMessage(error),
      status: 'error'
    };

    writeBenchmarkResult({
      format: request.format,
      result,
      submission: request.submissionFile,
      task
    });
    return exitCodeForResult(result);
  }
}

function parseBenchmarkRequest(argv: readonly string[]): BenchmarkRequest | undefined {
  if (argv[0] !== 'benchmark' || argv[1] !== 'run') {
    return undefined;
  }

  const args = argv.slice(2);
  const jsonFlagCount = args.filter((arg) => arg === '--json').length;

  if (jsonFlagCount > 1 || args.some((arg) => arg.startsWith('--') && arg !== '--json')) {
    return undefined;
  }

  const positional = args.filter((arg) => arg !== '--json');

  if (positional.length !== 2) {
    return undefined;
  }

  return {
    format: jsonFlagCount === 1 ? 'json' : 'human',
    submissionFile: positional[1] ?? '',
    taskFile: positional[0] ?? ''
  };
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}

function exitCodeForResult(result: BenchmarkResult): number {
  switch (result.status) {
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

function evaluateBenchmark(options: {
  readonly context: CommandHandlerContext;
  readonly submissionPath: string;
  readonly task: BenchmarkTask;
}): BenchmarkResult {
  const submissionCommands = qniCommandsInSubmission(options.submissionPath);
  const disallowedSubmission = disallowedSubmissionCommand(submissionCommands, options.task.allowedCommands);

  if (disallowedSubmission) {
    return {
      checks: [],
      disallowedSubmission,
      status: 'disallowed'
    };
  }

  const workDir = mkdtempSync(path.join(tmpdir(), 'qni-benchmark-'));

  try {
    runSubmission(submissionCommands, workDir, options.context);
    const checks = options.task.checks.items.map((check) => runCheck(check, options.task, workDir, options.context));

    return {
      checks,
      status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed'
    };
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
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

function qniCommandsInSubmission(submissionPath: string): SubmissionCommand[] {
  return readFileSync(submissionPath, 'utf8')
    .split(/\r?\n/u)
    .map((line, index) => ({ lineNumber: index + 1, source: line.trim() }))
    .filter((line) => line.source.length > 0)
    .map((line) => {
      const argv = splitCommandLine(line.source);

      if (argv[0] !== 'qni') {
        throw new BenchmarkError(`submission command must start with qni at line ${line.lineNumber}: ${line.source}`);
      }

      return {
        argv: argv.slice(1),
        lineNumber: line.lineNumber,
        source: line.source
      };
    });
}

function disallowedSubmissionCommand(
  commands: readonly SubmissionCommand[],
  allowedCommands: readonly AllowedCommand[]
): DisallowedSubmission | undefined {
  const command = commands.find((candidate) => !allowedCommands.some((allowed) => commandAllowed(candidate, allowed)));

  return command ? { command } : undefined;
}

function commandAllowed(command: SubmissionCommand, allowed: AllowedCommand): boolean {
  return allowed.argv.every((word, index) => command.argv[index] === word);
}

function runCheck(
  check: RunCheck,
  task: BenchmarkTask,
  workDir: string,
  context: CommandHandlerContext
): BenchmarkCheckResult {
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

export function streamChunkText(chunk: string | Uint8Array): string {
  return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

function loadBenchmarkTask(taskPath: string): BenchmarkTask {
  const frontmatter = frontmatterOf(readFileSync(taskPath, 'utf8'));

  return {
    allowedCommands: parseAllowedCommands(frontmatter),
    checks: parseChecks(frontmatter),
    id: scalarValue(frontmatter, 'id'),
    title: scalarValue(frontmatter, 'title')
  };
}

function frontmatterOf(markdown: string): string {
  const match = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(markdown);

  if (!match?.groups) {
    throw new BenchmarkError('benchmark task file must start with YAML frontmatter');
  }

  return match.groups.frontmatter;
}

function parseAllowedCommands(frontmatter: string): AllowedCommand[] {
  return frontmatterListValues(frontmatter, 'allowed_commands').map((source) => {
    const argv = splitCommandLine(source);

    if (argv[0] !== 'qni' || argv.length < 2) {
      throw new BenchmarkError(`allowed_commands entries must start with a qni subcommand: ${source}`);
    }

    return {
      argv: argv.slice(1),
      source: argv.join(' ')
    };
  });
}

function frontmatterListValues(frontmatter: string, key: string): string[] {
  const lines = frontmatter.split(/\r?\n/u);
  const keyPattern = key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const sectionHeader = new RegExp(`^${keyPattern}:\\s*(?:#.*)?$`, 'u');
  const startIndex = lines.findIndex((line) => sectionHeader.test(line));

  if (startIndex === -1) {
    throw new BenchmarkError(`${key} is required`);
  }

  const values: string[] = [];

  for (const line of lines.slice(startIndex + 1)) {
    if (/^\S/u.test(line)) {
      break;
    }

    const match = /^\s+-\s*(?<value>.+?)\s*$/u.exec(line);
    if (match?.groups) {
      values.push(match.groups.value);
    }
  }

  if (values.length === 0) {
    throw new BenchmarkError(`${key} must list at least one item`);
  }

  return values;
}

function parseChecks(frontmatter: string): BenchmarkChecks {
  return {
    items: parseRunChecks(frontmatter),
    tolerance: checksTolerance(frontmatter)
  };
}

function checksTolerance(frontmatter: string): number {
  const match = /^\s+tolerance:\s*(?<value>\S+)\s*$/mu.exec(frontmatter);

  if (!match?.groups) {
    throw new BenchmarkError('checks.tolerance is required');
  }

  return parseNumber(match.groups.value);
}

function parseRunChecks(frontmatter: string): RunCheck[] {
  if (!/^\s+-\s+type:\s*run\s*$/mu.test(frontmatter)) {
    throw new BenchmarkError('at least one run check is required');
  }

  return [{ expected: parseExpectedAmplitudes(frontmatter), type: 'run' }];
}

function parseExpectedAmplitudes(frontmatter: string): ExpectedAmplitude[] {
  const matches = [...frontmatter.matchAll(
    /^\s+-\s+basis:\s*(?<basis>.+?)\s*\r?\n\s+amplitude:\s*\r?\n\s+real:\s*(?<real>\S+)\s*\r?\n\s+imaginary:\s*(?<imaginary>\S+)\s*$/gmu
  )];

  if (matches.length === 0) {
    throw new BenchmarkError('run check expected amplitudes are required');
  }

  return matches.map((match) => {
    const groups = match.groups ?? {};

    return {
      amplitude: {
        imaginary: parseNumber(groups.imaginary ?? ''),
        real: parseNumber(groups.real ?? '')
      },
      basis: unquote(groups.basis ?? '')
    };
  });
}

function scalarValue(frontmatter: string, key: string): string {
  const match = new RegExp(`^${key}:\\s*(?<value>.+?)\\s*$`, 'mu').exec(frontmatter);

  if (!match?.groups) {
    throw new BenchmarkError(`${key} is required`);
  }

  return unquote(match.groups.value);
}

function parseNumber(value: string): number {
  const result = Number(value);

  if (Number.isNaN(result)) {
    throw new BenchmarkError(`invalid number: ${value}`);
  }

  return result;
}

function unquote(value: string): string {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
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

function splitCommandLine(command: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: string | undefined;
  let escaping = false;
  let tokenStarted = false;

  for (const char of command) {
    if (escaping) {
      current += char;
      escaping = false;
      tokenStarted = true;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      tokenStarted = true;
      continue;
    }

    if (/\s/u.test(char)) {
      if (tokenStarted) {
        words.push(current);
        current = '';
        tokenStarted = false;
      }
      continue;
    }

    current += char;
    tokenStarted = true;
  }

  if (escaping) {
    current += '\\';
    tokenStarted = true;
  }

  if (quote) {
    throw new BenchmarkError(`unterminated quote in command: ${command}`);
  }

  if (tokenStarted) {
    words.push(current);
  }

  return words;
}

function writeBenchmarkResult(options: {
  readonly format: BenchmarkOutputFormat;
  readonly result: BenchmarkResult;
  readonly submission: string;
  readonly task?: BenchmarkTask;
}): void {
  if (options.format === 'json') {
    writeJsonResult(options.task, options.submission, options.result);
    return;
  }

  writeHumanResult(options.task, options.result);
}

function writeHumanResult(task: BenchmarkTask | undefined, result: BenchmarkResult): void {
  if (result.status === 'error') {
    writeErrorResult(task, result);
    return;
  }

  if (!task) {
    throw new BenchmarkError('benchmark task is unavailable');
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

function writeJsonResult(task: BenchmarkTask | undefined, submission: string, result: BenchmarkResult): void {
  const payload: Record<string, unknown> = {
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
    payload.error = result.errorMessage;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
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
  return [
    `- ${check.type} #${index + 1}: state vector did not match expected amplitudes`,
    '  expected / actual mismatches:',
    ...displayedMismatches(check.mismatches.displayed),
    ...omittedMismatchLines(check.mismatches.omittedCount)
  ];
}

function displayedMismatches(mismatches: readonly AmplitudeMismatch[]): string[] {
  return mismatches
    .slice(0, MAX_FAILED_AMPLITUDE_DETAILS)
    .map((mismatch) => [
      `  - ${mismatch.basis}:`,
      `expected ${formatComplexAmplitude(mismatch.expected)},`,
      `actual ${formatComplexAmplitude(mismatch.actual)}`
    ].join(' '));
}

function omittedMismatchLines(omittedCount: number): string[] {
  if (omittedCount <= 0) {
    return [];
  }

  return [`  ... ${omittedCount} more mismatched amplitudes omitted`];
}

function basisLabel(index: number, vectorLength: number): string {
  const width = Math.log2(vectorLength);

  if (!Number.isInteger(width)) {
    throw new BenchmarkError(`state vector length is not a power of two: ${vectorLength}`);
  }

  return `|${index.toString(2).padStart(width, '0')}>`;
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
