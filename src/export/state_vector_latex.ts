import type { ExportTheme } from './quantikz_latex';

const HEADER_LINES = [
  '\\documentclass[border=2px]{standalone}',
  '',
  '\\usepackage{amsmath}',
  '\\usepackage{amssymb}',
  '\\usepackage{xcolor}',
  '\\newcommand{\\ket}[1]{\\left|#1\\right\\rangle}',
  '',
  '\\begin{document}'
] as const;

const FOOTER_LINES = ['\\end{document}'] as const;

export interface StateVectorLatexOptions {
  readonly latexFormula: string;
  readonly theme: ExportTheme;
}

export class StateVectorLatex {
  private readonly latexFormula: string;
  private readonly theme: ExportTheme;

  constructor(options: StateVectorLatexOptions) {
    this.latexFormula = options.latexFormula;
    this.theme = options.theme;
  }

  render(): string {
    return [...HEADER_LINES, ...this.bodyLines(), ...FOOTER_LINES].join('\n');
  }

  private bodyLines(): string[] {
    return [`{\\color{${this.themeColorName()}}$\\displaystyle ${this.latexFormula}$}`];
  }

  private themeColorName(): string {
    switch (this.theme) {
      case 'dark':
        return 'white';
      case 'light':
        return 'black';
      default:
        throw new Error(`unsupported export theme: ${String(this.theme)}`);
    }
  }
}
