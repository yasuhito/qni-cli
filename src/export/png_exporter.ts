import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export class PngExporterError extends Error {}

export type PngTransparency = 'opaque' | 'transparent';

export interface PngExportOptions {
  readonly targetHeight?: number;
  readonly targetWidth?: number;
  readonly transparency?: PngTransparency;
}

export interface PngExporterOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly latexSource: string;
  readonly options?: PngExportOptions;
  readonly outputPath: string;
}

interface ArtifactPaths {
  readonly pdf: string;
  readonly png: string;
  readonly pngBase: string;
  readonly tex: string;
}

interface CommandResult {
  readonly commandName: string;
  readonly error?: NodeJS.ErrnoException;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export class PngExporter {
  static readonly CELL_SIZE_PX = 64;

  private readonly env: NodeJS.ProcessEnv;
  private readonly latexSource: string;
  private readonly options: PngExportOptions;
  private readonly outputPath: string;

  constructor(options: PngExporterOptions) {
    this.env = options.env ?? {};
    this.latexSource = options.latexSource;
    this.outputPath = options.outputPath;
    this.options = {
      targetHeight: options.options?.targetHeight,
      targetWidth: options.options?.targetWidth,
      transparency: options.options?.transparency ?? 'transparent'
    };
  }

  export(): void {
    mkdirSync(path.dirname(this.outputPath), { recursive: true });

    const dir = mkdtempSync(path.join(tmpdir(), 'qni-export-'));
    try {
      this.exportFrom(dir);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  }

  private exportFrom(dir: string): void {
    const paths = artifactPaths(dir);

    writeFileSync(paths.tex, this.latexSource);
    this.compilePdf(dir, paths.tex);
    this.convertPdfToPng(paths.pdf, paths.pngBase);
    copyFileSync(paths.png, this.outputPath);
  }

  private compilePdf(dir: string, texPath: string): void {
    this.runCommand(
      ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '-output-directory', dir, texPath],
      'pdflatex is required for qni export --png'
    );
  }

  private convertPdfToPng(pdfPath: string, pngBasePath: string): void {
    this.runCommand(this.pdfToPngCommand(pdfPath, pngBasePath), 'pdftocairo is required for qni export --png');
  }

  private pdfToPngCommand(pdfPath: string, pngBasePath: string): string[] {
    return [...this.pdfToPngBaseCommand(), ...this.pdfToPngSizeArgs(), pdfPath, pngBasePath];
  }

  private pdfToPngBaseCommand(): string[] {
    const command = ['pdftocairo', '-singlefile', '-png', '-q'];

    if (this.options.transparency === 'transparent') {
      command.push('-transp');
    }

    return command;
  }

  private pdfToPngSizeArgs(): string[] {
    if (this.options.targetWidth === undefined || this.options.targetHeight === undefined) {
      return [];
    }

    return ['-scale-to-x', String(this.options.targetWidth), '-scale-to-y', String(this.options.targetHeight)];
  }

  private runCommand(command: readonly string[], missingMessage: string): void {
    const result = captureCommand(command, this.env);

    if (commandSucceeded(result)) {
      return;
    }

    throw new PngExporterError(errorMessage(result, missingMessage));
  }
}

function artifactPaths(dir: string): ArtifactPaths {
  const basePath = path.join(dir, 'circuit');

  return {
    pdf: `${basePath}.pdf`,
    png: `${basePath}.png`,
    pngBase: basePath,
    tex: `${basePath}.tex`
  };
}

function captureCommand(command: readonly string[], env: NodeJS.ProcessEnv): CommandResult {
  const result = spawnSync(command[0] ?? '', [...command.slice(1)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env
    }
  });

  return {
    commandName: command[0] ?? '',
    error: result.error as NodeJS.ErrnoException | undefined,
    status: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? ''
  };
}

function commandSucceeded(result: CommandResult): boolean {
  return result.error === undefined && result.status === 0;
}

function errorMessage(result: CommandResult, missingMessage: string): string {
  if (result.error?.code === 'ENOENT' || result.status === 127) {
    return missingMessage;
  }

  const detail = [result.stdout, result.stderr]
    .map((output) => output.trim())
    .filter((output) => output.length > 0)
    .join('\n');

  return detail.length === 0 ? `${result.commandName} failed` : `${result.commandName} failed: ${detail}`;
}
