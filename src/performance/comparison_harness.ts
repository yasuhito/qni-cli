import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface GeneratedCircuitInput {
  readonly depth: number;
  readonly kind: 'generated-circuit';
  readonly pattern: readonly string[];
  readonly qubits: number;
}

interface WorkloadFile {
  readonly command: readonly string[];
  readonly input: GeneratedCircuitInput;
  readonly name: string;
}

interface HarnessArgs {
  readonly output: string;
  readonly projectRoot: string;
  readonly repeat: number;
  readonly thresholdRatio: number;
  readonly warmUp: number;
  readonly workloads: readonly string[];
}

interface MeasuredRun {
  readonly exit_status: number | null;
  readonly peak_memory_bytes: number;
  readonly signal: NodeJS.Signals | null;
  readonly wall_clock_ms: number;
}

interface ImplementationReport {
  readonly command: string;
  readonly median_peak_memory_bytes: number;
  readonly median_wall_clock_ms: number;
  readonly runs: readonly MeasuredRun[];
}

interface WorkloadReport {
  readonly command: string;
  readonly comparison: {
    readonly investigation_required: boolean;
    readonly peak_memory_ratio: number | null;
    readonly reasons: readonly string[];
    readonly wall_clock_ratio: number | null;
  };
  readonly implementations: {
    readonly ruby: ImplementationReport;
    readonly typescript: ImplementationReport;
  };
  readonly input_size_bytes: number;
  readonly name: string;
}

interface PerformanceReport {
  readonly commit_sha: string;
  readonly generated_at: string;
  readonly repeat: number;
  readonly runtime_versions: {
    readonly node: string;
    readonly ruby: string;
    readonly typescript: string;
  };
  readonly schema_version: 1;
  readonly summary: {
    readonly investigation_required: boolean;
    readonly investigations: readonly string[];
  };
  readonly threshold_ratio: number;
  readonly warm_up: number;
  readonly workloads: readonly WorkloadReport[];
}

interface CommandSpec {
  readonly args: readonly string[];
  readonly command: string;
  readonly commandLine: string;
  readonly env: NodeJS.ProcessEnv;
}

const DEFAULT_REPEAT = 5;
const DEFAULT_THRESHOLD_RATIO = 1.2;
const DEFAULT_WARM_UP = 1;
const IDENTITY = 1;

export async function writePerformanceComparison(argv: readonly string[]): Promise<PerformanceReport> {
  const args = parseHarnessArgs(argv);
  ensureTypeScriptDispatcher(args.projectRoot);

  const workloads = await Promise.all(
    args.workloads.map(async (workloadPath) => runWorkload(workloadPath, args))
  );
  const investigations = workloads
    .filter((workload) => workload.comparison.investigation_required)
    .map((workload) => workload.name);
  const report: PerformanceReport = {
    commit_sha: commandOutput('git', ['rev-parse', 'HEAD'], args.projectRoot),
    generated_at: new Date().toISOString(),
    repeat: args.repeat,
    runtime_versions: {
      node: process.version,
      ruby: commandOutput('ruby', ['--version'], args.projectRoot),
      typescript: commandOutput('npx', ['tsc', '--version'], args.projectRoot)
    },
    schema_version: 1,
    summary: {
      investigation_required: investigations.length > 0,
      investigations
    },
    threshold_ratio: args.thresholdRatio,
    warm_up: args.warmUp,
    workloads
  };

  mkdirSync(path.dirname(args.output), { recursive: true });
  writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export async function main(argv: readonly string[]): Promise<void> {
  const report = await writePerformanceComparison(argv);
  const status = report.summary.investigation_required ? 'investigation-required' : 'ok';

  process.stdout.write(`performance comparison ${status}: ${report.workloads.length} workload(s)\n`);
}

function parseHarnessArgs(argv: readonly string[]): HarnessArgs {
  const workloads: string[] = [];
  let output = 'tmp/ruby_typescript_performance_comparison.json';
  let projectRoot = process.cwd();
  let repeat = DEFAULT_REPEAT;
  let thresholdRatio = DEFAULT_THRESHOLD_RATIO;
  let warmUp = DEFAULT_WARM_UP;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--workload':
        workloads.push(requiredValue(argv, index, arg));
        index += 1;
        break;
      case '--output':
        output = requiredValue(argv, index, arg);
        index += 1;
        break;
      case '--project-root':
        projectRoot = requiredValue(argv, index, arg);
        index += 1;
        break;
      case '--repeat':
        repeat = positiveInteger(requiredValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--threshold-ratio':
        thresholdRatio = positiveNumber(requiredValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--warm-up':
        warmUp = nonNegativeInteger(requiredValue(argv, index, arg), arg);
        index += 1;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  if (workloads.length === 0) {
    workloads.push('test/fixtures/performance/large_add_h_workload.json');
  }

  return {
    output: path.resolve(projectRoot, output),
    projectRoot: path.resolve(projectRoot),
    repeat,
    thresholdRatio,
    warmUp,
    workloads: workloads.map((workload) => path.resolve(projectRoot, workload))
  };
}

async function runWorkload(workloadPath: string, args: HarnessArgs): Promise<WorkloadReport> {
  const workload = parseWorkload(await readFile(workloadPath, 'utf8'), workloadPath);
  const circuitJson = `${JSON.stringify(generatedCircuit(workload.input), null, 2)}\n`;
  const implementations = {
    ruby: await runImplementation(rubyCommand(workload, args.projectRoot), circuitJson, args),
    typescript: await runImplementation(typeScriptCommand(workload, args.projectRoot), circuitJson, args)
  };

  return {
    command: qniCommandLine(workload.command),
    comparison: compareImplementations(implementations.ruby, implementations.typescript, args.thresholdRatio),
    implementations,
    input_size_bytes: Buffer.byteLength(circuitJson),
    name: workload.name
  };
}

async function runImplementation(
  command: CommandSpec,
  circuitJson: string,
  args: HarnessArgs
): Promise<ImplementationReport> {
  for (let index = 0; index < args.warmUp; index += 1) {
    const warmUp = await runMeasuredQni(command, circuitJson);
    ensureCommandSucceeded(command.commandLine, warmUp);
  }

  const runs: MeasuredRun[] = [];

  for (let index = 0; index < args.repeat; index += 1) {
    const run = await runMeasuredQni(command, circuitJson);

    ensureCommandSucceeded(command.commandLine, run);
    runs.push(run);
  }

  return {
    command: command.commandLine,
    median_peak_memory_bytes: median(runs.map((run) => run.peak_memory_bytes)),
    median_wall_clock_ms: median(runs.map((run) => run.wall_clock_ms)),
    runs
  };
}

async function runMeasuredQni(command: CommandSpec, circuitJson: string): Promise<MeasuredRun> {
  const cwd = mkdtempSync(path.join(tmpdir(), 'qni-perf-workload-'));

  try {
    writeFileSync(path.join(cwd, 'circuit.json'), circuitJson);
    return await runMeasuredCommand(command, cwd);
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
}

function runMeasuredCommand(command: CommandSpec, cwd: string): Promise<MeasuredRun> {
  return new Promise((resolve, reject) => {
    const startedAt = process.hrtime.bigint();
    let peakMemoryBytes = 0;
    const child = spawn(command.command, [...command.args], {
      cwd,
      env: command.env,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    const stderrChunks: Buffer[] = [];
    const sampleMemory = (): void => {
      peakMemoryBytes = Math.max(peakMemoryBytes, residentMemoryBytes(child.pid));
    };
    const sampler = setInterval(sampleMemory, 5);

    sampler.unref();
    sampleMemory();
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.once('error', (error) => {
      clearInterval(sampler);
      reject(error);
    });
    child.once('close', (exitStatus, signal) => {
      clearInterval(sampler);
      const finishedAt = process.hrtime.bigint();
      const wallClockMs = Number(finishedAt - startedAt) / 1_000_000;

      if (exitStatus !== 0) {
        process.stderr.write(Buffer.concat(stderrChunks).toString('utf8'));
      }

      resolve({
        exit_status: exitStatus,
        peak_memory_bytes: peakMemoryBytes,
        signal,
        wall_clock_ms: wallClockMs
      });
    });
  });
}

function residentMemoryBytes(pid: number | undefined): number {
  if (pid === undefined) {
    return 0;
  }

  if (process.platform !== 'linux') {
    return psResidentMemoryBytes(pid);
  }

  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8');
    const peak = status.match(/^VmHWM:\s+(\d+)\s+kB/mu);
    const current = status.match(/^VmRSS:\s+(\d+)\s+kB/mu);
    const kilobytes = Number((peak ?? current)?.[1] ?? '0');

    return kilobytes * 1024;
  } catch {
    return 0;
  }
}

function psResidentMemoryBytes(pid: number): number {
  const result = spawnSync('ps', ['-o', 'rss=', '-p', String(pid)], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return 0;
  }

  const kilobytes = Number(result.stdout.trim());

  return Number.isFinite(kilobytes) ? kilobytes * 1024 : 0;
}

function compareImplementations(
  ruby: ImplementationReport,
  typescript: ImplementationReport,
  thresholdRatio: number
): WorkloadReport['comparison'] {
  const wallClockRatio = ratio(typescript.median_wall_clock_ms, ruby.median_wall_clock_ms);
  const peakMemoryRatio = ratio(typescript.median_peak_memory_bytes, ruby.median_peak_memory_bytes);
  const reasons: string[] = [];

  if (wallClockRatio !== null && wallClockRatio > thresholdRatio) {
    reasons.push('wall-clock');
  }

  if (peakMemoryRatio !== null && peakMemoryRatio > thresholdRatio) {
    reasons.push('peak-memory');
  }

  return {
    investigation_required: reasons.length > 0,
    peak_memory_ratio: peakMemoryRatio,
    reasons,
    wall_clock_ratio: wallClockRatio
  };
}

function parseWorkload(json: string, workloadPath: string): WorkloadFile {
  const parsed = JSON.parse(json) as Partial<WorkloadFile>;

  if (!parsed.name || !Array.isArray(parsed.command) || parsed.input?.kind !== 'generated-circuit') {
    throw new Error(`invalid performance workload: ${workloadPath}`);
  }

  return parsed as WorkloadFile;
}

function generatedCircuit(input: GeneratedCircuitInput): Record<string, unknown> {
  return {
    cols: Array.from({ length: input.depth }, (_, step) => (
      Array.from({ length: input.qubits }, (_, qubit) => gateAt(input.pattern, step, qubit))
    )),
    qubits: input.qubits
  };
}

function gateAt(pattern: readonly string[], step: number, qubit: number): string | number {
  const gate = pattern[(step + qubit) % pattern.length];

  return gate === '1' ? IDENTITY : gate;
}

function rubyCommand(workload: WorkloadFile, projectRoot: string): CommandSpec {
  return {
    args: ['exec', path.join(projectRoot, 'bin', 'qni'), ...workload.command],
    command: 'bundle',
    commandLine: ['bundle', 'exec', 'bin/qni', ...workload.command].join(' '),
    env: {
      ...process.env,
      BUNDLE_GEMFILE: path.join(projectRoot, 'Gemfile')
    }
  };
}

function typeScriptCommand(workload: WorkloadFile, projectRoot: string): CommandSpec {
  return {
    args: [path.join(projectRoot, 'dist', 'bin', 'qni.js'), ...workload.command],
    command: process.execPath,
    commandLine: ['node', 'dist/bin/qni.js', ...workload.command].join(' '),
    env: {
      ...process.env,
      BUNDLE_GEMFILE: path.join(projectRoot, 'Gemfile')
    }
  };
}

function qniCommandLine(command: readonly string[]): string {
  return ['qni', ...command].join(' ');
}

function ensureCommandSucceeded(commandLine: string, run: MeasuredRun): void {
  if (run.exit_status !== 0) {
    const reason = run.signal === null ? `exit ${run.exit_status}` : `killed by signal ${run.signal}`;

    throw new Error(`command failed (${reason}): ${commandLine}`);
  }
}

function ensureTypeScriptDispatcher(projectRoot: string): void {
  const dispatcherPath = path.join(projectRoot, 'dist', 'bin', 'qni.js');

  if (existsSync(dispatcherPath)) {
    return;
  }

  const result = spawnSync('npm', ['run', 'build'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('failed to build TypeScript dispatcher');
  }
}

function commandOutput(command: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`failed to run ${command} ${args.join(' ')}`);
  }

  return result.stdout.trim();
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(3));
}

function positiveInteger(value: string, option: string): number {
  const parsed = nonNegativeInteger(value, option);

  if (parsed === 0) {
    throw new Error(`${option} must be greater than zero`);
  }

  return parsed;
}

function nonNegativeInteger(value: string, option: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be a non-negative integer`);
  }

  return parsed;
}

function positiveNumber(value: string, option: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} must be greater than zero`);
  }

  return parsed;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];

  if (!value) {
    throw new Error(`${option} requires a value`);
  }

  return value;
}
