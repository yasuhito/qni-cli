import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');
import { parseDocument } from 'yaml';

import type { CommandHandler, CommandHandlerContext } from '../dispatcher';
import { runAddCommand } from './add_command';
import { runExpectCommand } from './expect_command';
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
  readonly items: readonly BenchmarkCheck[];
  readonly tolerance: number;
}

type BenchmarkCheck = ExpectCheck | RunCheck;

interface RunCheck {
  readonly expected: readonly ExpectedAmplitude[];
  readonly type: 'run';
}

interface ExpectCheck {
  readonly expected: readonly ExpectedExpectation[];
  readonly type: 'expect';
}

interface ExpectedAmplitude {
  readonly amplitude: ComplexAmplitude;
  readonly basis: string;
}

interface ExpectedExpectation {
  readonly pauli: string;
  readonly value: number;
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

interface BenchmarkResult {
  readonly checks: readonly BenchmarkCheckResult[];
  readonly disallowedSubmission?: DisallowedSubmission;
  readonly errorMessage?: string;
  readonly status: BenchmarkStatus;
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

interface BenchmarkSuiteSummary {
  readonly disallowed: number;
  readonly error: number;
  readonly failed: number;
  readonly passed: number;
  readonly total: number;
}

type BenchmarkCheckResult = ExpectCheckResult | RunCheckResult;

interface RunCheckResult {
  readonly mismatches: MismatchSummary;
  readonly status: 'passed' | 'failed';
  readonly type: 'run';
}

interface ExpectCheckResult {
  readonly mismatches: ExpectationMismatchSummary;
  readonly status: 'passed' | 'failed';
  readonly type: 'expect';
}

interface MismatchSummary {
  readonly displayed: readonly AmplitudeMismatch[];
  readonly omittedCount: number;
}

interface ExpectationMismatchSummary {
  readonly displayed: readonly ExpectationMismatch[];
  readonly omittedCount: number;
}

interface AmplitudeMismatch {
  readonly actual: ComplexAmplitude;
  readonly basis: string;
  readonly expected: ComplexAmplitude;
}

interface ExpectationMismatch {
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
const USAGE = [
  'Usage: qni benchmark run <task-file> <submission-file> [--json]',
  '       qni benchmark run-all <benchmark-dir> <solutions-dir> [--json]',
  ''
].join('\n');
const MAX_FAILED_AMPLITUDE_DETAILS = 16;
const MAX_FAILED_EXPECTATION_DETAILS = 16;
const ZERO_AMPLITUDE: ComplexAmplitude = { imaginary: 0, real: 0 };

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

function runBenchmarkSuite(request: BenchmarkSuiteRequest, context: CommandHandlerContext): number {
  try {
    const benchmarkDirPath = resolveInputPath(request.benchmarkDir, context);
    const solutionsDirPath = resolveInputPath(request.solutionsDir, context);
    const entries = benchmarkSuiteEntries({
      benchmarkDir: request.benchmarkDir,
      benchmarkDirPath,
      solutionsDir: request.solutionsDir,
      solutionsDirPath
    });
    const suite = benchmarkSuiteResult(entries.map((entry) => evaluateBenchmarkSuiteEntry(entry, context)));

    writeBenchmarkSuiteResult({
      format: request.format,
      suite
    });
    return suite.exitCode;
  } catch (error) {
    const suite: BenchmarkSuiteResult = {
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

    writeBenchmarkSuiteResult({
      format: request.format,
      suite
    });
    return suite.exitCode;
  }
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

export function streamChunkText(chunk: string | Uint8Array): string {
  return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

type FrontmatterRecord = Readonly<Record<string, unknown>>;

function loadBenchmarkTask(taskPath: string): BenchmarkTask {
  const frontmatter = frontmatterRecord(frontmatterOf(readFileSync(taskPath, 'utf8')));

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

function frontmatterRecord(frontmatter: string): FrontmatterRecord {
  const document = parseDocument(frontmatter);
  const firstError = document.errors[0];

  if (firstError) {
    throw new BenchmarkError(`invalid YAML frontmatter: ${firstYamlErrorLine(firstError)}`);
  }

  const value = document.toJS() as unknown;

  if (!isRecord(value)) {
    throw new BenchmarkError('YAML frontmatter must be a mapping');
  }

  return value;
}

function firstYamlErrorLine(error: Error): string {
  return error.message.split(/\r?\n/u)[0] ?? error.message;
}

function parseAllowedCommands(frontmatter: FrontmatterRecord): AllowedCommand[] {
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

function frontmatterListValues(frontmatter: FrontmatterRecord, key: string): string[] {
  const value = requiredValue(frontmatter, key);

  if (!Array.isArray(value)) {
    throw new BenchmarkError(`${key} must list at least one item`);
  }

  if (value.length === 0) {
    throw new BenchmarkError(`${key} must list at least one item`);
  }

  return value.map((item) => stringListValue(item, key));
}

function parseChecks(frontmatter: FrontmatterRecord): BenchmarkChecks {
  const checks = recordValue(frontmatter, 'checks');

  return {
    items: parseCheckItems(checks),
    tolerance: checksTolerance(checks)
  };
}

function checksTolerance(checks: FrontmatterRecord): number {
  return parseNumber(requiredValue(checks, 'tolerance', 'checks.tolerance is required'));
}

function parseCheckItems(checks: FrontmatterRecord): BenchmarkCheck[] {
  const items = requiredValue(checks, 'items', 'checks.items is required');

  if (!Array.isArray(items) || items.length === 0) {
    throw new BenchmarkError('checks.items must list at least one item');
  }

  return items.map(parseCheckItem);
}

function parseCheckItem(item: unknown): BenchmarkCheck {
  const check = requiredRecord(item, 'checks.items entries must be mappings');
  const type = scalarValue(check, 'type');

  switch (type) {
    case 'expect':
      return { expected: parseExpectedExpectations(check), type: 'expect' };
    case 'run':
      return { expected: parseExpectedAmplitudes(check), type: 'run' };
    default:
      throw new BenchmarkError(`unsupported check type: ${type}`);
  }
}

function parseExpectedAmplitudes(check: FrontmatterRecord): ExpectedAmplitude[] {
  const expected = expectedList(check, 'run check expected amplitudes are required');

  return expected.map((item) => {
    const entry = requiredRecord(item, 'run check expected amplitudes must be mappings');
    const amplitude = recordValue(entry, 'amplitude');

    return {
      amplitude: {
        imaginary: parseNumber(requiredValue(amplitude, 'imaginary')),
        real: parseNumber(requiredValue(amplitude, 'real'))
      },
      basis: scalarValue(entry, 'basis')
    };
  });
}

function parseExpectedExpectations(check: FrontmatterRecord): ExpectedExpectation[] {
  const expected = expectedList(check, 'expect check expected values are required');

  return expected.map((item) => {
    const entry = requiredRecord(item, 'expect check expected values must be mappings');
    const pauli = scalarValue(entry, 'pauli').toUpperCase();

    if (pauli.length === 0) {
      throw new BenchmarkError('expect check pauli must not be empty');
    }

    return {
      pauli,
      value: parseNumber(requiredValue(entry, 'value'))
    };
  });
}

function expectedList(check: FrontmatterRecord, errorMessage: string): readonly unknown[] {
  const expected = check.expected;

  if (!Array.isArray(expected) || expected.length === 0) {
    throw new BenchmarkError(errorMessage);
  }

  return expected;
}

function recordValue(record: FrontmatterRecord, key: string): FrontmatterRecord {
  return requiredRecord(requiredValue(record, key), `${key} must be a mapping`);
}

function requiredRecord(value: unknown, errorMessage: string): FrontmatterRecord {
  if (!isRecord(value)) {
    throw new BenchmarkError(errorMessage);
  }

  return value;
}

function requiredValue(record: FrontmatterRecord, key: string, errorMessage = `${key} is required`): unknown {
  const value = record[key];

  if (value === undefined) {
    throw new BenchmarkError(errorMessage);
  }

  return value;
}

function scalarValue(record: FrontmatterRecord, key: string): string {
  const value = requiredValue(record, key);

  if (typeof value !== 'string') {
    throw new BenchmarkError(`${key} must be a string`);
  }

  return value;
}

function stringListValue(value: unknown, key: string): string {
  if (typeof value !== 'string') {
    throw new BenchmarkError(`${key} entries must be strings`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function writeBenchmarkSuiteResult(options: {
  readonly format: BenchmarkOutputFormat;
  readonly suite: BenchmarkSuiteResult;
}): void {
  if (options.format === 'json') {
    writeJsonSuiteResult(options.suite);
    return;
  }

  writeHumanSuiteResult(options.suite);
}

function writeHumanSuiteResult(suite: BenchmarkSuiteResult): void {
  if (suite.results.length === 0 && suite.status === 'error') {
    process.stdout.write('ERROR benchmark suite\n');
    if (suite.errorMessage) {
      process.stdout.write(`error: ${suite.errorMessage}\n`);
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
    process.stdout.write(`- ${item.result.status} ${item.task?.id ?? item.taskFile} ${item.task?.title ?? '(unavailable)'}\n`);
  }
}

function writeJsonSuiteResult(suite: BenchmarkSuiteResult): void {
  const payload: Record<string, unknown> = {
    status: suite.status,
    exitCode: suite.exitCode,
    summary: suite.summary,
    results: suite.results.map((item) => ({
      ...benchmarkResultPayload(item.task, item.submission, item.result),
      task: item.taskFile
    }))
  };

  if (suite.errorMessage) {
    payload.error = suite.errorMessage;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
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
  process.stdout.write(`${JSON.stringify(benchmarkResultPayload(task, submission, result), null, 2)}\n`);
}

function benchmarkResultPayload(
  task: BenchmarkTask | undefined,
  submission: string,
  result: BenchmarkResult
): Record<string, unknown> {
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

  return payload;
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
