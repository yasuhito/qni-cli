import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { thorArgumentsError } from './thor_compatibility';

const HELP_TEXT = `Usage:
  qni clear

Overview:
  Delete ./circuit.json.
  If ./circuit.json does not exist, qni clear still succeeds.
  Standard output is empty on success.

Examples:
  qni clear`;

export function runClearCommand(argv: string[], context: CommandHandlerContext): number {
  try {
    if (argv[1] === '--help' || argv[1] === '-h') {
      process.stdout.write(`${HELP_TEXT}\n`);
      return 0;
    }

    if (argv.length > 1) {
      process.stderr.write(`${thorArgumentsError('qni clear', argv.slice(1), 'qni clear')}\n`);
      return 1;
    }

    currentCircuitFile(context.cwd).clear();
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
