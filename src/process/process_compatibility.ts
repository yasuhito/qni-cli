import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';

export interface SubprocessInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface RunSubprocessOptions extends SubprocessInvocation {
  readonly stdout?: Writable;
  readonly stderr?: Writable;
}

export interface SubprocessResult {
  readonly exitStatus: number | null;
  readonly signal: NodeJS.Signals | null;
}

function mergedEnv(env: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...env
  };
}

export function commandLineArgs(processArgv: readonly string[] = process.argv): string[] {
  return processArgv.slice(2);
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
