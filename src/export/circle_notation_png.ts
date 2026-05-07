import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { StateVectorExportPayload } from '../simulator';
import type { ExportTheme } from './qcircuit_latex';

export class CircleNotationPngError extends Error {}

export interface CircleNotationPngOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly outputPath: string;
  readonly projectRoot: string;
  readonly stateVector: StateVectorExportPayload;
  readonly theme: ExportTheme;
}

interface CircleNotationRenderPayload extends StateVectorExportPayload {
  readonly output_path: string;
  readonly theme: ExportTheme;
}

interface HelperCommand {
  readonly args: readonly string[];
  readonly command: string;
}

interface HelperResult {
  readonly error?: NodeJS.ErrnoException;
  readonly status: number | null;
  readonly stderr: string;
}

const SETUP_MESSAGE = 'circle-notation rendering requires matplotlib and Pillow; run scripts/setup_symbolic_python.sh';

export class CircleNotationPng {
  private readonly env: NodeJS.ProcessEnv;
  private readonly outputPath: string;
  private readonly projectRoot: string;
  private readonly stateVector: StateVectorExportPayload;
  private readonly theme: ExportTheme;

  constructor(options: CircleNotationPngOptions) {
    this.env = options.env ?? {};
    this.outputPath = options.outputPath;
    this.projectRoot = options.projectRoot;
    this.stateVector = options.stateVector;
    this.theme = options.theme;
  }

  export(): void {
    mkdirSync(path.dirname(this.outputPath), { recursive: true });

    for (const command of this.helperCommands()) {
      const result = this.runWithHelper(command);

      if (result === 'file-rendered') {
        return;
      }
    }

    throw new CircleNotationPngError(SETUP_MESSAGE);
  }

  private helperCommands(): HelperCommand[] {
    const helperPath = path.join(this.projectRoot, 'libexec', 'qni_circle_notation_render.py');

    return [
      {
        args: [helperPath],
        command: path.join(this.projectRoot, '.python-symbolic', 'bin', 'python')
      },
      {
        args: [helperPath],
        command: 'python3'
      }
    ];
  }

  private runWithHelper(command: HelperCommand): 'file-rendered' | 'retry-with-next-command' {
    const result = this.captureHelper(command);

    if (result.error?.code === 'ENOENT') {
      return 'retry-with-next-command';
    }

    if (result.error) {
      throw new CircleNotationPngError(result.error.message);
    }

    if (result.status === 0) {
      return 'file-rendered';
    }

    if (retryableWithNextCommand(result.stderr)) {
      return 'retry-with-next-command';
    }

    throw new CircleNotationPngError(helperErrorMessage(result.stderr, result.status));
  }

  private captureHelper(command: HelperCommand): HelperResult {
    const result = spawnSync(command.command, [...command.args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ...this.env,
        MPLCONFIGDIR: path.join(tmpdir(), 'qni-cli-matplotlib'),
        UV_CACHE_DIR: path.join(tmpdir(), 'qni-cli-uv-cache')
      },
      input: JSON.stringify(this.payload()),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return {
      error: result.error as NodeJS.ErrnoException | undefined,
      status: result.status,
      stderr: result.stderr ?? ''
    };
  }

  private payload(): CircleNotationRenderPayload {
    return {
      ...this.stateVector,
      output_path: this.outputPath,
      theme: this.theme
    };
  }
}

function retryableWithNextCommand(stderr: string): boolean {
  return stderr.includes("No module named 'matplotlib'") || stderr.includes("No module named 'PIL'");
}

function helperErrorMessage(stderr: string, status: number | null): string {
  const message = stderr.trim();

  return message.length === 0 ? `circle-notation renderer failed with exit status ${status ?? ''}` : message;
}
