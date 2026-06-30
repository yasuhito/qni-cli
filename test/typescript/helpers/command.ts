import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createDispatcher } from '../../../src/dispatcher';

export interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface CapturedValue<T> {
  readonly stderr: string;
  readonly stdout: string;
  readonly value: T;
}

interface TempDirOptions {
  readonly prefix?: string;
}

type WriteCallback = (error?: Error | null) => void;

const DEFAULT_TEMP_DIR_PREFIX = 'qni-cli-ts-';

export async function withTempDir<T>(
  callback: (dir: string) => Promise<T> | T,
  options: TempDirOptions = {}
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), safeTempDirPrefix(options.prefix)));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

export function captureProcessWrites<TCallback extends () => unknown>(
  callback: ReturnType<TCallback> extends PromiseLike<unknown> ? never : TCallback
): CapturedValue<ReturnType<TCallback>>;
export function captureProcessWrites<T>(callback: () => T): CapturedValue<T> {
  let stdout = '';
  let stderr = '';
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | WriteCallback,
    callback?: WriteCallback
  ): boolean => {
    stdout += chunkToString(chunk);
    callWriteCallbacks(encodingOrCallback, callback);
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | WriteCallback,
    callback?: WriteCallback
  ): boolean => {
    stderr += chunkToString(chunk);
    callWriteCallbacks(encodingOrCallback, callback);
    return true;
  }) as typeof process.stderr.write;

  try {
    const value = callback();
    if (isPromiseLike(value)) {
      throw new TypeError('captureProcessWrites only supports synchronous callbacks');
    }

    return {
      stderr,
      stdout,
      value
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

export function captureDispatcherRun(
  cwd: string,
  argv: string[],
  env: NodeJS.ProcessEnv = { PATH: '' }
): CapturedRun {
  const captured = captureProcessWrites(() => {
    const dispatcher = createDispatcher({
      cwd,
      env,
      projectRoot: process.cwd()
    });

    return dispatcher.run(argv);
  });

  return {
    exitStatus: captured.value,
    stderr: captured.stderr,
    stdout: captured.stdout
  };
}

function safeTempDirPrefix(prefix: string | undefined): string {
  const basename = path.basename(prefix ?? DEFAULT_TEMP_DIR_PREFIX);

  if (basename === '' || basename === '.' || basename === '..') {
    return DEFAULT_TEMP_DIR_PREFIX;
  }

  return basename;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function chunkToString(chunk: string | Uint8Array): string {
  return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

function callWriteCallbacks(
  encodingOrCallback: BufferEncoding | WriteCallback | undefined,
  callback: WriteCallback | undefined
): void {
  if (typeof encodingOrCallback === 'function') {
    encodingOrCallback();
  }
  if (callback) {
    callback();
  }
}
