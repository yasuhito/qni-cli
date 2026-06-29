import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SimulatorError } from '../simulator';
import type { BlochFrame } from './sampler';

export type BlochRenderFormat = 'apng' | 'inline_frames' | 'inline_png' | 'png';
export type BlochTheme = 'dark' | 'light';

type RenderResult = Buffer[] | Buffer | null;
type FileRenderRequest = BlochRenderRequest & { readonly format: 'apng' | 'png' };
type InlineFramesRenderRequest = BlochRenderRequest & { readonly format: 'inline_frames' };
type InlinePngRenderRequest = BlochRenderRequest & { readonly format: 'inline_png' };

export interface BlochRenderRequest {
  readonly env: NodeJS.ProcessEnv;
  readonly format: BlochRenderFormat;
  readonly frames: readonly BlochFrame[];
  readonly outputPath?: string;
  readonly projectRoot: string;
  readonly showTrail: boolean;
  readonly theme: BlochTheme;
}

interface HelperCommand {
  readonly args: readonly string[];
  readonly command: string;
}

const SETUP_MESSAGE = 'bloch rendering requires matplotlib and Pillow; run scripts/setup_symbolic_python.sh';
const HELPER_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const HELPER_ENV = {
  MPLCONFIGDIR: path.join(tmpdir(), 'qni-cli-matplotlib'),
  UV_CACHE_DIR: path.join(tmpdir(), 'qni-cli-uv-cache')
};

export function renderBloch(request: FileRenderRequest): null;
export function renderBloch(request: InlineFramesRenderRequest): Buffer[];
export function renderBloch(request: InlinePngRenderRequest): Buffer;
export function renderBloch(request: BlochRenderRequest): RenderResult {
  for (const command of helperCommands(request.projectRoot)) {
    const result = runWithHelper(command, request);

    if (result !== 'retry_with_next_command') {
      return result;
    }
  }

  throw new SimulatorError(SETUP_MESSAGE);
}

function helperCommands(projectRoot: string): HelperCommand[] {
  const helperPath = path.join(projectRoot, 'libexec', 'qni_bloch_render.py');

  return [
    { command: path.join(projectRoot, '.python-symbolic', 'bin', 'python'), args: [helperPath] },
    { command: 'python3', args: [helperPath] }
  ];
}

function runWithHelper(command: HelperCommand, request: BlochRenderRequest): RenderResult | 'retry_with_next_command' {
  const result = spawnSync(command.command, [...command.args], {
    env: {
      ...process.env,
      ...request.env,
      ...HELPER_ENV
    },
    input: JSON.stringify(payload(request)),
    maxBuffer: HELPER_MAX_BUFFER_BYTES,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.error) {
    if (isNodeError(result.error) && result.error.code === 'ENOENT') {
      return 'retry_with_next_command';
    }

    throw new SimulatorError(result.error.message);
  }

  if (result.status === 0) {
    return parsedOutput(request.format, result.stdout);
  }

  const stderr = result.stderr.toString('utf8');

  if (retryableWithNextCommand(stderr)) {
    return 'retry_with_next_command';
  }

  throw new SimulatorError(helperErrorMessage(stderr, result.status));
}

function payload(request: BlochRenderRequest): Record<string, unknown> {
  return {
    format: request.format,
    output_path: request.outputPath ?? null,
    frames: request.frames,
    show_trail: request.showTrail,
    theme: request.theme
  };
}

function parsedOutput(format: BlochRenderFormat, stdout: Buffer): RenderResult {
  if (format === 'png' || format === 'apng') {
    return null;
  }

  if (format === 'inline_png') {
    return stdout;
  }

  const parsed = JSON.parse(stdout.toString('utf8')) as { frames: string[] };
  return parsed.frames.map((encodedFrame) => Buffer.from(encodedFrame, 'base64'));
}

function helperErrorMessage(stderr: string, exitStatus: number | null): string {
  const message = stderr.trim();
  return message.length === 0 ? `bloch renderer failed with exit status ${exitStatus ?? 'null'}` : message;
}

function retryableWithNextCommand(stderr: string): boolean {
  return stderr.includes("No module named 'matplotlib'") || stderr.includes("No module named 'PIL'");
}

function isNodeError(error: Error): error is NodeJS.ErrnoException {
  return Object.hasOwn(error, 'code');
}
