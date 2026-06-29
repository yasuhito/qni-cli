import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { TextRenderer } from '../view/text_renderer';
import { thorArgumentsError } from './thor_compatibility';

const HELP_TEXT = `Usage:
  qni view

Overview:
  Render ./circuit.json as an ASCII circuit diagram.
  Output uses plain box-drawing text in non-TTY contexts.

Examples:
  qni view
`;

export function runViewCommand(argv: string[], context: CommandHandlerContext): number {
  if (helpRequest(argv)) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  try {
    if (argv.length > 1) {
      throw new CircuitFileError(thorArgumentsError('qni view', argv.slice(1), 'qni view'));
    }
    const circuit = currentCircuitFile(context.cwd).load();
    const renderer = new TextRenderer(circuit, { style: process.stdout.isTTY ? 'colorized' : 'plain' });

    process.stdout.write(`${renderer.render()}\n`);
    return 0;
  } catch (error) {
    if (error instanceof CircuitFileError) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }

    throw error;
  }
}

function helpRequest(argv: string[]): boolean {
  return argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h');
}

