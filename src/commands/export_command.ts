import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { QCircuitLatex, validateCaptionOptions, type ExportTheme } from '../export/qcircuit_latex';
import { runRubyFallbackSync } from '../process/process_compatibility';

const HELP_TEXT = `Usage:
  qni export --latex-source [--output=PATH]
  qni export --png [--caption=TEXT] [--caption-tex] [--caption-position=top|bottom] [--caption-size=N] --output=PATH
  qni export --state-vector --png --output=PATH
  qni export --circle-notation --png --output=PATH

Overview:
  Export ./circuit.json as qcircuit LaTeX or PNG.
  --latex-source writes qcircuit LaTeX to standard output by default.
  With --output=PATH, --latex-source writes the LaTeX file instead.
  --png renders the qcircuit LaTeX with pdflatex and converts the PDF to PNG with pdftocairo.
  --caption adds explanatory text above or below regular circuit export.
  --caption-tex treats --caption as raw LaTeX instead of escaping it.
  --no-transparent writes an opaque PNG background, useful for light circuit lines on dark note themes.
  --state-vector renders the symbolic state vector as LaTeX and converts it to PNG.
  --circle-notation renders the final computational-basis state as a circle-notation PNG.
  qni export follows qni's step constraints, so one step can contain simple 1-qubit gates, one controlled gate, or one 2-qubit SWAP.

Options:
  --latex-source  # write qcircuit LaTeX
  --png           # write PNG rendered from qcircuit LaTeX
  --state-vector  # write the symbolic state vector as PNG
  --circle-notation # write the computational-basis circle notation as PNG
  --dark          # draw white circuit lines for dark backgrounds (default)
  --light         # draw black circuit lines for light backgrounds
  [--[no-]transparent] # write PNG with transparent background (default: true)
  [--caption=TEXT] # add a caption to regular circuit export
  [--caption-tex] # treat --caption as raw LaTeX
  [--caption-position=top|bottom] # caption position (default: bottom)
  [--caption-size=N] # caption font size in pt (default: 12)
  [--output=PATH] # output file path; required for --png

Examples:
  qni export --latex-source
  qni export --latex-source --output circuit.tex
  qni export --latex-source --light
  qni export --png --output circuit.png
  qni export --png --dark --output circuit.png
  qni export --png --caption "CNOT before cut" --output circuit.png
  qni export --png --caption '$\\mathrm{CNOT}$' --caption-tex --output circuit.png
  qni export --png --light --no-transparent --output circuit.png
  qni export --state-vector --png --output state.png
  qni export --circle-notation --png --output circles.png
`;

interface ExportOptions {
  readonly caption?: string;
  readonly captionFormat: 'tex' | 'text';
  readonly captionSizeError?: string;
  readonly captionPosition: string;
  readonly captionSize: number;
  readonly circleNotation: boolean;
  readonly dark: boolean;
  readonly latexSource: boolean;
  readonly light: boolean;
  readonly output?: string;
  readonly png: boolean;
  readonly stateVector: boolean;
}

const BOOLEAN_OPTIONS = new Map<string, (options: MutableExportOptions) => void>([
  ['--caption-tex', (options) => {
    options.captionFormat = 'tex';
  }],
  ['--circle-notation', (options) => {
    options.circleNotation = true;
  }],
  ['--dark', (options) => {
    options.dark = true;
  }],
  ['--latex-source', (options) => {
    options.latexSource = true;
  }],
  ['--light', (options) => {
    options.light = true;
  }],
  ['--no-transparent', () => undefined],
  ['--png', (options) => {
    options.png = true;
  }],
  ['--state-vector', (options) => {
    options.stateVector = true;
  }],
  ['--transparent', () => undefined]
]);

const VALUE_OPTIONS = new Map<string, (options: MutableExportOptions, value: string) => void>([
  ['--caption', (options, value) => {
    options.caption = value;
  }],
  ['--caption-position', (options, value) => {
    options.captionPosition = value;
  }],
  ['--caption-size', (options, value) => {
    const captionSize = parseCaptionSize(value);

    if (captionSize === undefined) {
      options.captionSizeError = `Expected numeric value for '--caption-size'; got "${value}"`;
      return;
    }

    options.captionSize = captionSize;
  }],
  ['--output', (options, value) => {
    options.output = value;
  }]
]);

type MutableExportOptions = {
  -readonly [Property in keyof ExportOptions]: ExportOptions[Property];
};

export function runExportCommand(argv: string[], context: CommandHandlerContext): number {
  if (helpRequest(argv)) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  const options = parseExportOptions(argv.slice(1));

  if (!options) {
    return rubyFallback(argv, context);
  }

  try {
    if (!typeScriptLatexSource(options)) {
      return rubyFallback(argv, context);
    }

    validateOptions(options);

    const latexSource = new QCircuitLatex(currentCircuitFile(context.cwd).load(), {
      caption: options.caption,
      captionFormat: options.captionFormat,
      captionPosition: options.captionPosition,
      captionSize: options.captionSize,
      theme: theme(options)
    }).render();

    writeLatexSource(latexSource, options, context.cwd);
    return 0;
  } catch (error) {
    if (error instanceof CircuitFileError || error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }

    throw error;
  }
}

function helpRequest(argv: string[]): boolean {
  return argv.length === 1 || (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h'));
}

function parseExportOptions(args: string[]): ExportOptions | undefined {
  const options: MutableExportOptions = {
    captionFormat: 'text',
    captionPosition: 'bottom',
    captionSize: 12,
    circleNotation: false,
    dark: false,
    latexSource: false,
    light: false,
    png: false,
    stateVector: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split(/=(.*)/su, 2);
    const valueSetter = VALUE_OPTIONS.get(name);

    if (valueSetter) {
      const value = inlineValue ?? args[index + 1];

      if (value === undefined || (inlineValue === undefined && value.startsWith('-'))) {
        return undefined;
      }

      if (inlineValue === undefined) {
        index += 1;
      }

      valueSetter(options, value ?? '');
      continue;
    }

    const booleanSetter = BOOLEAN_OPTIONS.get(arg);

    if (!booleanSetter) {
      return undefined;
    }

    booleanSetter(options);
  }

  return options;
}

function validateOptions(options: ExportOptions): void {
  if (options.captionSizeError) {
    throw new Error(options.captionSizeError);
  }

  if (!options.png && options.stateVector) {
    throw new Error('--state-vector currently supports only --png');
  }

  if (!options.png && options.circleNotation) {
    throw new Error('--circle-notation currently supports only --png');
  }

  if (options.latexSource === options.png) {
    throw new Error('choose exactly one of --latex-source or --png');
  }

  if (options.dark && options.light) {
    throw new Error('choose at most one of --dark or --light');
  }

  if (options.stateVector && options.circleNotation) {
    throw new Error('choose at most one of --state-vector or --circle-notation');
  }

  if (captionPresent(options) && (options.stateVector || options.circleNotation)) {
    throw new Error('--caption is supported only for regular circuit export');
  }

  validateCaptionOptions({
    caption: options.caption,
    captionFormat: options.captionFormat,
    captionPosition: options.captionPosition,
    captionSize: options.captionSize
  });

  if (options.png && !options.output) {
    throw new Error('--output=PATH is required for --png');
  }
}

function captionPresent(options: ExportOptions): boolean {
  return (options.caption ?? '').length > 0;
}

function parseCaptionSize(value: string): number | undefined {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(value)) {
    return undefined;
  }

  return Math.trunc(Number(value));
}

function rubyFallback(argv: string[], context: CommandHandlerContext): number {
  return runRubyFallbackSync({
    argv,
    cwd: context.cwd,
    env: context.env,
    projectRoot: context.projectRoot
  }).exitStatus ?? 1;
}

function theme(options: ExportOptions): ExportTheme {
  return options.light ? 'light' : 'dark';
}

function typeScriptLatexSource(options: ExportOptions): boolean {
  return options.latexSource && !options.png && !options.stateVector && !options.circleNotation;
}

function writeLatexSource(latexSource: string, options: ExportOptions, cwd: string): void {
  if (!options.output) {
    process.stdout.write(`${latexSource}\n`);
    return;
  }

  const outputPath = path.resolve(cwd, options.output);

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${latexSource}\n`);
}
