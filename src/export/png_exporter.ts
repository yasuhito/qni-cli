import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

const CELL_SIZE_PX = 64;

export interface PngExportOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly outputPath: string;
  readonly targetHeight?: number;
  readonly targetWidth?: number;
  readonly transparent: boolean;
}

interface ArtifactPaths {
  readonly pdf: string;
  readonly png: string;
  readonly pngBase: string;
  readonly tex: string;
}

export function circuitPngHeight(qubits: number): number {
  return qubits * CELL_SIZE_PX;
}

export function circuitPngWidth(columns: number): number {
  return columns * CELL_SIZE_PX;
}

export class PngExporter {
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly latexSource: string;
  private readonly outputPath: string;
  private readonly targetHeight?: number;
  private readonly targetWidth?: number;
  private readonly transparent: boolean;

  constructor(latexSource: string, options: PngExportOptions) {
    this.cwd = options.cwd;
    this.env = options.env;
    this.latexSource = latexSource;
    this.outputPath = options.outputPath;
    this.targetHeight = options.targetHeight;
    this.targetWidth = options.targetWidth;
    this.transparent = options.transparent;
  }

  export(): void {
    mkdirSync(path.dirname(this.outputPath), { recursive: true });

    const dir = mkdtempSync(path.join(tmpdir(), 'qni-export'));

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
    cpSync(paths.png, this.outputPath);
  }

  private compilePdf(dir: string, texPath: string): void {
    this.runCommand(
      'pdflatex',
      ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', dir, texPath],
      'pdflatex is required for qni export --png'
    );
  }

  private convertPdfToPng(pdfPath: string, pngBasePath: string): void {
    this.runCommand(
      'pdftocairo',
      [...this.pdfToPngBaseArgs(), ...this.pdfToPngSizeArgs(), pdfPath, pngBasePath],
      'pdftocairo is required for qni export --png'
    );
  }

  private pdfToPngBaseArgs(): string[] {
    const args = ['-singlefile', '-png', '-q'];

    if (this.transparent) {
      args.push('-transp');
    }

    return args;
  }

  private pdfToPngSizeArgs(): string[] {
    if (this.targetWidth === undefined || this.targetHeight === undefined) {
      return [];
    }

    return ['-scale-to-x', String(this.targetWidth), '-scale-to-y', String(this.targetHeight)];
  }

  private runCommand(command: string, args: string[], missingMessage: string): void {
    const result = spawnSync(command, args, {
      cwd: this.cwd,
      env: {
        ...process.env,
        ...this.env
      }
    });

    if (result.error && nodeErrorCode(result.error) === 'ENOENT') {
      throw new Error(missingMessage);
    }

    if (result.status !== 0) {
      throw new Error(commandErrorMessage(command, result, missingMessage));
    }
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

function commandErrorMessage(command: string, result: SpawnSyncReturns<Buffer>, missingMessage: string): string {
  if (result.status === 127) {
    return missingMessage;
  }

  const detail = [result.stdout, result.stderr]
    .map((output) => output.toString('utf8').trim())
    .filter((output) => output.length > 0)
    .join('\n');

  if (detail.length === 0) {
    return `${command} failed`;
  }

  return `${command} failed: ${detail}`;
}

function nodeErrorCode(error: Error): string | undefined {
  return 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}
