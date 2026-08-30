import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { CommandError, reportCommandRouteError } from './command_error';

const HELP_TEXT = `Usage:
  qni state set "alpha|0> + beta|1>"
  qni state show
  qni state clear

Overview:
  Manage the initial state vector in ./circuit.json.
  Initial states support 1-qubit shorthand, multi-qubit computational basis kets,
  Bell states, and linear combinations of computational or Bell basis states.
  Coefficients can be numeric literals or ASCII identifiers such as alpha.
  qni state clear removes the explicit initial state and falls back to |0>.

Examples:
  qni state set "|+>"
  qni state set "|100>"
  qni state set "|Φ+>"
  qni state set "alpha|Φ+> + beta|Ψ->"
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
      throw new CommandError(`unsupported state subcommand: ${subcommand}`);
    }

    const output = executeSubcommand(subcommand, argv.slice(2), context);

    if (output.length > 0) {
      process.stdout.write(`${output}\n`);
    }

    return 0;
  } catch (error) {
    return reportCommandRouteError(error);
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
      circuitFile.clearInitialState();
      return '';
    case 'set':
      requireArgumentCount(args, 1);
      requireStateExpression(args[0]);
      circuitFile.setInitialState(args[0]);
      return '';
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
    throw new CommandError('wrong number of arguments');
  }
}

function requireStateExpression(value: string): void {
  if (value.length === 0) {
    throw new CommandError('initial state expression is required');
  }
}
