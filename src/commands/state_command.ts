import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';

const HELP_TEXT = `Usage:
  qni state set "alpha|0> + beta|1>"
  qni state show
  qni state clear

Overview:
  Manage the initial state vector in ./circuit.json.
  The first release supports 1-qubit ket sums such as alpha|0> + beta|1>.
  Coefficients can be numeric literals or ASCII identifiers such as alpha.
  qni state clear removes the explicit initial state and falls back to |0>.

Examples:
  qni state set "alpha|0> + beta|1>"
  qni state show
  qni state clear`;

type StateSubcommand = 'clear' | 'set' | 'show';
type TypeScriptStateSubcommand = StateSubcommand;

const TYPESCRIPT_SUBCOMMANDS = new Set<TypeScriptStateSubcommand>(['clear', 'set', 'show']);

export function runStateCommand(argv: string[], context: CommandHandlerContext): number {
  const subcommand = argv[1];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    if (!isTypeScriptStateSubcommand(subcommand)) {
      throw new CircuitFileError(`unsupported state subcommand: ${subcommand}`);
    }

    const output = executeSubcommand(subcommand, argv.slice(2), context);

    if (output.length > 0) {
      process.stdout.write(`${output}\n`);
    }

    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function executeSubcommand(
  subcommand: TypeScriptStateSubcommand,
  args: string[],
  context: CommandHandlerContext
): string {
  const circuitFile = currentCircuitFile(context.cwd);

  switch (subcommand) {
    case 'clear':
      requireArgumentCount(args, 0);
      return circuitFile.clearInitialState() ? '0' : '';
    case 'set':
      requireArgumentCount(args, 1);
      return circuitFile.setInitialState(args[0]) ? '0' : '';
    case 'show':
      requireArgumentCount(args, 0);
      return circuitFile.initialStateText();
  }
}

function isTypeScriptStateSubcommand(value: string): value is TypeScriptStateSubcommand {
  return TYPESCRIPT_SUBCOMMANDS.has(value as TypeScriptStateSubcommand);
}

function requireArgumentCount(args: string[], expected: number): void {
  if (args.length !== expected) {
    throw new CircuitFileError('wrong number of arguments');
  }
}
