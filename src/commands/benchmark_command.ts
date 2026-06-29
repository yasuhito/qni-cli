import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');

import type { CommandHandler, CommandHandlerContext } from '../dispatcher';
import { runAddCommand } from './add_command';
import { runRunCommand } from './run_command';

interface BenchmarkTask {
  readonly checks: BenchmarkChecks;
  readonly id: string;
  readonly title: string;
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

interface ComplexAmplitude {
  readonly imaginary: number;
  readonly real: number;
}

interface QniCommandResult {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface BenchmarkResult {
  readonly checkCount: number;
  readonly status: 'passed' | 'failed';
}

class BenchmarkError extends Error {}

const QNI_COMMAND_HANDLERS = new Map<string, CommandHandler>([
  ['add', runAddCommand],
  ['run', runRunCommand]
]);
const USAGE = 'Usage: qni benchmark run <task-file> <submission-file>\n';
const ZERO_AMPLITUDE: ComplexAmplitude = { imaginary: 0, real: 0 };

export function runBenchmarkCommand(argv: string[], context: CommandHandlerContext): number {
  const request = parseBenchmarkRequest(argv);

  if (!request) {
    process.stderr.write(USAGE);
    return 3;
  }

  try {
    const taskPath = resolveInputPath(request.taskFile, context);
    const submissionPath = resolveInputPath(request.submissionFile, context);
    const task = loadBenchmarkTask(taskPath);
    const result = evaluateBenchmark({
      context,
      submissionPath,
      task
    });

    writeHumanResult(task, result);
    return result.status === 'passed' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 3;
  }
}

function parseBenchmarkRequest(argv: readonly string[]): { submissionFile: string; taskFile: string } | undefined {
  if (argv.length !== 4 || argv[0] !== 'benchmark' || argv[1] !== 'run') {
    return undefined;
  }

  return {
    submissionFile: argv[3] ?? '',
    taskFile: argv[2] ?? ''
  };
}

function evaluateBenchmark(options: {
  readonly context: CommandHandlerContext;
  readonly submissionPath: string;
  readonly task: BenchmarkTask;
}): BenchmarkResult {
  const workDir = mkdtempSync(path.join(tmpdir(), 'qni-benchmark-'));

  try {
    runSubmission(options.submissionPath, workDir, options.context);
    const checksPassed = options.task.checks.items.every((check) => runCheckPassed(check, options.task, workDir, options.context));

    return {
      checkCount: options.task.checks.items.length,
      status: checksPassed ? 'passed' : 'failed'
    };
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
}

function runSubmission(submissionPath: string, workDir: string, context: CommandHandlerContext): void {
  for (const command of qniCommandsInSubmission(submissionPath)) {
    const result = runQni(command.argv, workDir, context);

    if (result.exitStatus !== 0) {
      throw new BenchmarkError([
        `submission command failed at line ${command.lineNumber}: ${command.source}`,
        result.stderr.trimEnd()
      ].filter(Boolean).join('\n'));
    }
  }
}

function qniCommandsInSubmission(submissionPath: string): { argv: string[]; lineNumber: number; source: string }[] {
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

function runCheckPassed(
  check: RunCheck,
  task: BenchmarkTask,
  workDir: string,
  context: CommandHandlerContext
): boolean {
  const result = runQni(['run'], workDir, context);

  if (result.exitStatus !== 0) {
    throw new BenchmarkError(`run check failed to execute for ${task.id}: ${result.stderr.trimEnd()}`);
  }

  return stateVectorMatches(parseStateVector(result.stdout), check.expected, task.checks.tolerance);
}

function stateVectorMatches(
  actual: readonly ComplexAmplitude[],
  expectedAmplitudes: readonly ExpectedAmplitude[],
  tolerance: number
): boolean {
  const expected = Array.from({ length: actual.length }, () => ZERO_AMPLITUDE);

  for (const item of expectedAmplitudes) {
    expected[basisIndex(item.basis, actual.length)] = item.amplitude;
  }

  return actual.every((amplitude, index) => amplitudesClose(amplitude, expected[index] ?? ZERO_AMPLITUDE, tolerance));
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
    if (value[index] === '+' || value[index] === '-') {
      return index;
    }
  }

  return -1;
}

function basisIndex(basis: string, vectorLength: number): number {
  const match = /^\|(?<bits>[01]+)>$/u.exec(basis);

  if (!match?.groups) {
    throw new BenchmarkError(`unsupported basis label: ${basis}`);
  }

  const index = Number.parseInt(match.groups.bits, 2);

  if (index >= vectorLength) {
    throw new BenchmarkError(`basis label is outside the state vector: ${basis}`);
  }

  return index;
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
    stdout += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
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
    stderr += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
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

function loadBenchmarkTask(taskPath: string): BenchmarkTask {
  const frontmatter = frontmatterOf(readFileSync(taskPath, 'utf8'));

  return {
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

function writeHumanResult(task: BenchmarkTask, result: BenchmarkResult): void {
  const label = result.status === 'passed' ? 'PASS' : 'FAIL';

  process.stdout.write(`${label} ${task.title}\n`);
  process.stdout.write(`checks: ${result.checkCount}\n`);
}
