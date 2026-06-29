import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';

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
      process.stderr.write(`ERROR: "qni clear" was called with arguments ${rubyArray(argv.slice(1))}\n`);
      process.stderr.write('Usage: "qni clear"\n');
      return 1;
    }

    currentCircuitFile(context.cwd).clear();
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function rubyArray(values: readonly string[]): string {
  return `[${values.map((value) => `"${value}"`).join(', ')}]`;
}
