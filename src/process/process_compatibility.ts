import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import type { Writable } from 'node:stream';

export interface SubprocessInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface ResolvedSubprocessInvocation extends SubprocessInvocation {
  readonly env: NodeJS.ProcessEnv;
}

export interface RunSubprocessOptions extends SubprocessInvocation {
  readonly stdout?: Writable;
  readonly stderr?: Writable;
}

export interface SubprocessResult {
  readonly exitStatus: number | null;
  readonly signal: NodeJS.Signals | null;
}

export interface RubyFallbackOptions {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly projectRoot: string;
}

export interface RunRubyFallbackOptions extends RubyFallbackOptions {
  readonly stdout?: Writable;
  readonly stderr?: Writable;
}

export interface RunRubyFallbackSyncOptions extends RubyFallbackOptions {
  readonly stdout?: Writable;
  readonly stderr?: Writable;
}

export interface CommandImplementationOptions {
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly migratedCommands: ReadonlySet<string>;
}

export type CommandImplementation =
  | {
      readonly kind: 'ruby';
      readonly reason: 'forced-by-env';
    }
  | {
      readonly command: string;
      readonly kind: 'ruby';
      readonly reason: 'unmigrated-command';
    }
  | {
      readonly command: string;
      readonly kind: 'typescript';
    };

function mergedEnv(env: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...env
  };
}

export function commandLineArgs(processArgv: readonly string[] = process.argv): string[] {
  return processArgv.slice(2);
}

export function rubyFallbackForced(env: NodeJS.ProcessEnv): boolean {
  return env.QNI_USE_RUBY === '1';
}

export function chooseCommandImplementation(
  options: CommandImplementationOptions
): CommandImplementation {
  if (rubyFallbackForced(options.env)) {
    return { kind: 'ruby', reason: 'forced-by-env' };
  }

  const command = options.argv[0] ?? '';

  if (options.migratedCommands.has(command)) {
    return { command, kind: 'typescript' };
  }

  return { command, kind: 'ruby', reason: 'unmigrated-command' };
}

export function createRubyFallbackInvocation(options: RubyFallbackOptions): ResolvedSubprocessInvocation {
  return {
    args: ['exec', path.join(options.projectRoot, 'bin', 'qni'), ...options.argv],
    command: 'bundle',
    cwd: options.cwd,
    env: {
      ...mergedEnv(options.env),
      BUNDLE_GEMFILE: path.join(options.projectRoot, 'Gemfile')
    }
  };
}

export function runSubprocess(options: RunSubprocessOptions): Promise<SubprocessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: mergedEnv(options.env),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.pipe(options.stdout ?? process.stdout, { end: false });
    child.stderr.pipe(options.stderr ?? process.stderr, { end: false });
    child.once('error', reject);
    child.once('close', (exitStatus, signal) => {
      resolve({ exitStatus, signal });
    });
  });
}

export function runRubyFallback(options: RunRubyFallbackOptions): Promise<SubprocessResult> {
  return runSubprocess({
    ...createRubyFallbackInvocation(options),
    stderr: options.stderr,
    stdout: options.stdout
  });
}

export function runRubyFallbackSync(options: RunRubyFallbackSyncOptions): SubprocessResult {
  const invocation = createRubyFallbackInvocation(options);
  const result = spawnSync(invocation.command, [...invocation.args], {
    cwd: invocation.cwd,
    env: invocation.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    (options.stderr ?? process.stderr).write(`${result.error.message}\n`);
    return { exitStatus: 127, signal: null };
  }

  (options.stdout ?? process.stdout).write(result.stdout);
  (options.stderr ?? process.stderr).write(result.stderr);

  return {
    exitStatus: result.status,
    signal: result.signal
  };
}
