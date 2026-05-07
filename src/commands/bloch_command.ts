import path from 'node:path';

import { currentCircuitFile, CircuitFileError } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { BlochSampler } from '../bloch/sampler';
import { renderBloch, type BlochRenderFormat, type BlochTheme } from '../bloch/renderer';
import { KittyGraphicsEmitter } from '../bloch/kitty_graphics_emitter';
import { runRubyFallbackSync } from '../process/process_compatibility';
import { SimulatorError } from '../simulator';

const HELP_TEXT = `Usage:
  qni bloch --png --output bloch.png
  qni bloch --png --trajectory --output bloch.png
  qni bloch --apng --output bloch.png
  qni bloch --inline
  qni bloch --inline --animate

Overview:
  Render the current 1-qubit state on the Bloch sphere.
  --png writes a static Bloch sphere image.
  --apng writes an animated Bloch sphere showing state evolution.
  --inline draws the Bloch sphere directly in a Kitty-compatible terminal.
  The first release supports only 1-qubit circuits with fully resolved numeric parameters.

Options:
  --png           # write a Bloch sphere PNG
  --apng          # write a Bloch sphere APNG
  --inline        # render a Bloch sphere inline in a Kitty-compatible terminal
  --animate       # animate inline Bloch output; valid only with --inline
  --trajectory    # draw the sampled state-evolution trail on the Bloch sphere
  --dark          # draw light content for dark backgrounds (default)
  --light         # draw dark content for light backgrounds
  [--output=PATH] # output file path; required for --png and --apng

Examples:
  qni bloch --png --output bloch.png
  qni bloch --png --trajectory --output bloch.png
  qni bloch --apng --output bloch.png
  qni bloch --png --light --output bloch.png
  qni bloch --inline
  qni bloch --inline --animate
`;

interface BlochOptions {
  readonly animate: boolean;
  readonly apng: boolean;
  readonly dark: boolean;
  readonly inline: boolean;
  readonly light: boolean;
  readonly output?: string;
  readonly png: boolean;
  readonly trajectory: boolean;
}

type MutableBlochOptions = {
  -readonly [Property in keyof BlochOptions]: BlochOptions[Property];
};

const BOOLEAN_OPTIONS = new Map<string, (options: MutableBlochOptions) => void>([
  ['--animate', (options) => {
    options.animate = true;
  }],
  ['--apng', (options) => {
    options.apng = true;
  }],
  ['--dark', (options) => {
    options.dark = true;
  }],
  ['--inline', (options) => {
    options.inline = true;
  }],
  ['--light', (options) => {
    options.light = true;
  }],
  ['--png', (options) => {
    options.png = true;
  }],
  ['--trajectory', (options) => {
    options.trajectory = true;
  }]
]);

export function runBlochCommand(argv: string[], context: CommandHandlerContext): number {
  if (helpRequest(argv)) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  const options = parseBlochOptions(argv.slice(1));

  if (!options) {
    return rubyFallback(argv, context);
  }

  try {
    validateOptions(options);
    render(options, context);
    return 0;
  } catch (error) {
    if (error instanceof CircuitFileError || error instanceof SimulatorError || error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }

    throw error;
  }
}

function helpRequest(argv: string[]): boolean {
  return argv.length === 1 || (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h'));
}

function parseBlochOptions(args: string[]): BlochOptions | undefined {
  const options: MutableBlochOptions = {
    animate: false,
    apng: false,
    dark: false,
    inline: false,
    light: false,
    png: false,
    trajectory: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split(/=(.*)/su, 2);

    if (name === '--output') {
      const value = inlineValue ?? args[index + 1];

      if (value === undefined || (inlineValue === undefined && value.startsWith('-'))) {
        return undefined;
      }

      if (inlineValue === undefined) {
        index += 1;
      }

      options.output = value;
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

function validateOptions(options: BlochOptions): void {
  if ([options.png, options.apng, options.inline].filter(Boolean).length !== 1) {
    throw new Error('choose exactly one of --png, --apng, or --inline');
  }

  if (options.animate && !options.inline) {
    throw new Error('--animate is supported only with --inline');
  }

  if (options.dark && options.light) {
    throw new Error('choose at most one of --dark or --light');
  }

  if (options.inline) {
    if ((options.output ?? '').length > 0) {
      throw new Error('--output is not supported with --inline');
    }
    return;
  }

  if ((options.output ?? '').length === 0) {
    throw new Error('--output is required');
  }
}

function render(options: BlochOptions, context: CommandHandlerContext): void {
  const frames = new BlochSampler(
    currentCircuitFile(context.cwd).load(),
    options.trajectory ? 'trajectory' : 'gates_only'
  ).frames();

  if (options.inline) {
    renderInline(options, context, frames);
    return;
  }

  renderBloch({
    format: options.apng ? 'apng' : 'png',
    outputPath: options.output ? path.resolve(context.cwd, options.output) : undefined,
    env: context.env,
    frames,
    projectRoot: context.projectRoot,
    showTrail: options.trajectory,
    theme: theme(options)
  });
}

function renderInline(options: BlochOptions, context: CommandHandlerContext, frames: ReturnType<BlochSampler['frames']>): void {
  ensureSupportedTerminal(context.env);

  if (options.animate) {
    const renderedFrames = renderBloch({
      format: 'inline_frames',
      env: context.env,
      frames,
      projectRoot: context.projectRoot,
      showTrail: options.trajectory,
      theme: theme(options)
    });
    new KittyGraphicsEmitter().emitAnimation(renderedFrames as Buffer[]);
    return;
  }

  const renderedFrame = renderBloch({
    format: 'inline_png',
    env: context.env,
    frames,
    projectRoot: context.projectRoot,
    showTrail: options.trajectory,
    theme: theme(options)
  });
  new KittyGraphicsEmitter().emitPngFrame(renderedFrame as Buffer);
}

function ensureSupportedTerminal(env: NodeJS.ProcessEnv): void {
  if (env.QNI_TEST_FORCE_INLINE === '1') {
    return;
  }

  if (process.stdout.isTTY && (env.KITTY_WINDOW_ID || env.TERM?.includes('kitty') || ghosttyTerminal(env))) {
    return;
  }

  throw new SimulatorError('inline bloch rendering requires a Kitty-compatible terminal; use --png or --apng instead');
}

function ghosttyTerminal(env: NodeJS.ProcessEnv): boolean {
  return env.TERM_PROGRAM?.toLowerCase() === 'ghostty' || env.TERM?.includes('ghostty') === true;
}

function rubyFallback(argv: string[], context: CommandHandlerContext): number {
  return runRubyFallbackSync({
    argv,
    cwd: context.cwd,
    env: context.env,
    projectRoot: context.projectRoot
  }).exitStatus ?? 1;
}

function theme(options: BlochOptions): BlochTheme {
  return options.light ? 'light' : 'dark';
}
