import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CircuitFileError, currentCircuitFile, type CircuitData } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { CircleNotationPng } from '../export/circle_notation_png';
import { CircuitSvg } from '../export/circuit_svg';
import {
  QCircuitLatex,
  qcircuitRenderedColumnCount,
  validateCaptionOptions,
  type ExportTheme
} from '../export/qcircuit_latex';
import { circuitPngHeight, circuitPngWidth, PngExporter } from '../export/png_exporter';
import { StateVectorLatex } from '../export/state_vector_latex';
import { Simulator } from '../simulator';
import { thorArgumentsError } from './thor_compatibility';
import { renderSymbolicStateVector } from '../symbolic_state_renderer';

const HELP_TEXT = `Usage:
  qni export --svg [--caption=TEXT] [--caption-position=top|bottom] [--caption-size=N] [--output=PATH]
  qni export --latex-source [--output=PATH]
  qni export --png [--caption=TEXT] [--caption-tex] [--caption-position=top|bottom] [--caption-size=N] --output=PATH
  qni export --state-vector --png --output=PATH
  qni export --circle-notation --png --output=PATH

Overview:
  Export ./circuit.json as an SVG, qcircuit LaTeX, or PNG.
  --svg draws the circuit directly without a LaTeX installation and writes SVG to standard output by default.
  With --output=PATH, --svg or --latex-source writes the corresponding file instead.
  --latex-source writes qcircuit LaTeX to standard output by default.
  --png renders the qcircuit LaTeX with pdflatex and converts the PDF to PNG with pdftocairo.
  --caption adds explanatory text above or below regular circuit export.
  --caption-tex treats --caption as raw LaTeX instead of escaping it.
  --no-transparent writes an opaque PNG background, useful for light circuit lines on dark note themes.
  --state-vector renders the symbolic state vector as LaTeX and converts it to PNG.
  --circle-notation renders the final computational-basis state as a circle-notation PNG.
  qni export follows qni's step constraints, so one step can contain simple 1-qubit gates, one controlled gate, one 2-qubit SWAP, or one controlled 2-qubit SWAP.

Options:
  --svg           # write SVG directly without LaTeX
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
  qni export --svg
  qni export --svg --light --output circuit.svg
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
  readonly svg: boolean;
  readonly transparent: boolean;
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
  ['--no-transparent', (options) => {
    options.transparent = false;
  }],
  ['--png', (options) => {
    options.png = true;
  }],
  ['--state-vector', (options) => {
    options.stateVector = true;
  }],
  ['--svg', (options) => {
    options.svg = true;
  }],
  ['--transparent', (options) => {
    options.transparent = true;
  }]
]);

const VALUE_OPTIONS = new Map<string, (options: MutableExportOptions, value: string) => void>([
  ['--caption', (options, value) => {
    options.caption = value;
  }],
  ['--caption-position', (options, value) => {
    options.captionPosition = value;
  }],
  ['--caption-size', (options, value) => {
    if (value.length === 0) {
      options.captionSizeError = "No value provided for option '--caption-size'";
      return;
    }

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

  try {
    const options = parseExportOptions(argv.slice(1));
    validateOptions(options);

    const circuit = currentCircuitFile(context.cwd).load();

    if (options.stateVector) {
      writeStateVectorPng(circuit, options, context);
      return 0;
    }

    if (options.circleNotation) {
      writeCircleNotationPng(circuit, options, context);
      return 0;
    }

    if (options.svg) {
      const svg = new CircuitSvg(circuit, {
        caption: options.caption,
        captionPosition: options.captionPosition,
        captionSize: options.captionSize,
        theme: theme(options)
      }).render();
      writeTextOutput(svg, options, context.cwd);
      return 0;
    }

    const latexSource = new QCircuitLatex(circuit, {
      caption: options.caption,
      captionFormat: options.captionFormat,
      captionPosition: options.captionPosition,
      captionSize: options.captionSize,
      theme: theme(options)
    }).render();

    if (options.png) {
      writePng(latexSource, options, context, qcircuitRenderedColumnCount(circuit), circuit.qubits);
    } else {
      writeTextOutput(latexSource, options, context.cwd);
    }

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

function parseExportOptions(args: string[]): ExportOptions {
  const options: MutableExportOptions = {
    captionFormat: 'text',
    captionPosition: 'bottom',
    captionSize: 12,
    circleNotation: false,
    dark: false,
    latexSource: false,
    light: false,
    png: false,
    stateVector: false,
    svg: false,
    transparent: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split(/=(.*)/su, 2);
    const valueSetter = VALUE_OPTIONS.get(name);

    if (valueSetter) {
      const value = optionValue(name, inlineValue, args[index + 1]);

      if (inlineValue === undefined && value.consumeNext) {
        index += 1;
      }

      valueSetter(options, value.value);
      continue;
    }

    const booleanSetter = BOOLEAN_OPTIONS.get(arg);

    if (!booleanSetter) {
      throw new Error(thorArgumentsError('qni export', [arg], 'qni export'));
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

  if (Number(options.latexSource) + Number(options.png) + Number(options.svg) !== 1) {
    throw new Error('choose exactly one of --svg, --latex-source, or --png');
  }

  if (options.svg && (options.stateVector || options.circleNotation)) {
    throw new Error('--svg supports only regular circuit export');
  }

  if (options.svg && options.captionFormat === 'tex') {
    throw new Error('--caption-tex is not supported with --svg');
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

function optionValue(optionName: string, inlineValue: string | undefined, nextValue: string | undefined): {
  readonly consumeNext: boolean;
  readonly value: string;
} {
  if (inlineValue !== undefined) {
    return { consumeNext: false, value: inlineValue };
  }

  if (optionName === '--caption-size') {
    if (nextValue === undefined || optionLikeCaptionSizeValue(nextValue)) {
      return { consumeNext: false, value: '' };
    }

    return { consumeNext: true, value: nextValue };
  }

  if (nextValue === undefined || nextValue.startsWith('-')) {
    return { consumeNext: false, value: optionName.slice(2) };
  }

  return { consumeNext: true, value: nextValue };
}

function optionLikeCaptionSizeValue(value: string): boolean {
  return value.startsWith('-') && parseCaptionSize(value) === undefined;
}

function parseCaptionSize(value: string): number | undefined {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(value)) {
    return undefined;
  }

  return Math.trunc(Number(value));
}

function theme(options: ExportOptions): ExportTheme {
  return options.light ? 'light' : 'dark';
}

function writeTextOutput(output: string, options: ExportOptions, cwd: string): void {
  if (!options.output) {
    process.stdout.write(`${output}\n`);
    return;
  }

  const outputPath = path.resolve(cwd, options.output);

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${output}\n`);
}

function writePng(
  latexSource: string,
  options: ExportOptions,
  context: CommandHandlerContext,
  columns: number,
  qubits: number
): void {
  const exporterOptions = captionPresent(options)
    ? {}
    : {
        targetHeight: circuitPngHeight(qubits),
        targetWidth: circuitPngWidth(columns)
      };

  new PngExporter(latexSource, {
    cwd: context.cwd,
    env: context.env,
    outputPath: outputPath(options, context.cwd),
    transparent: options.transparent,
    ...exporterOptions
  }).export();
}

function writeStateVectorPng(circuit: CircuitData, options: ExportOptions, context: CommandHandlerContext): void {
  const latexFormula = renderSymbolicStateVector({
    circuit,
    env: context.env,
    format: 'latex',
    projectRoot: context.projectRoot
  });
  const latexSource = new StateVectorLatex({
    latexFormula,
    theme: theme(options)
  }).render();

  new PngExporter(latexSource, {
    cwd: context.cwd,
    env: context.env,
    outputPath: outputPath(options, context.cwd),
    transparent: options.transparent
  }).export();
}

function writeCircleNotationPng(circuit: CircuitData, options: ExportOptions, context: CommandHandlerContext): void {
  new CircleNotationPng({
    env: context.env,
    outputPath: outputPath(options, context.cwd),
    projectRoot: context.projectRoot,
    stateVector: new Simulator(circuit).exportPayload(),
    theme: theme(options)
  }).export();
}

function outputPath(options: ExportOptions, cwd: string): string {
  return path.resolve(cwd, options.output ?? '');
}
