import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';

const HELP_TEXT = `Usage:
  qni variable set NAME ANGLE
  qni variable list
  qni variable unset NAME
  qni variable clear

Overview:
  Manage symbolic angle variables in ./circuit.json.
  NAME must be an ASCII identifier such as theta.
  ANGLE must be concrete, such as π/4, pi/3, or 0.5.
  qni variable set requires ./circuit.json to already exist.
  qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
  qni run and qni expect resolve symbolic angles through these variables.

Examples:
  qni variable set theta π/4
  qni variable list
  qni variable unset theta
  qni variable clear`;

type VariableSubcommand = 'clear' | 'list' | 'set' | 'unset';

const SUBCOMMANDS = new Set<VariableSubcommand>(['clear', 'list', 'set', 'unset']);

export function runVariableCommand(argv: string[], context: CommandHandlerContext): number {
  try {
    const subcommand = argv[1];

    if (!subcommand || subcommand === '--help' || subcommand === '-h') {
      process.stdout.write(`${HELP_TEXT}\n`);
      return 0;
    }

    if (!isVariableSubcommand(subcommand)) {
      throw new CircuitFileError(`unsupported variable subcommand: ${subcommand}`);
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
  subcommand: VariableSubcommand,
  args: string[],
  context: CommandHandlerContext
): string {
  const circuitFile = currentCircuitFile(context.cwd);

  switch (subcommand) {
    case 'clear':
      return circuitFile.clearVariables() ? '0' : '';
    case 'list':
      return Object.entries(circuitFile.variables())
        .sort(([leftName], [rightName]) => compareVariableNames(leftName, rightName))
        .map(([name, value]) => `${name}=${value}`)
        .join('\n');
    case 'set':
      circuitFile.setVariable(
        requiredArgument(args[0], 'wrong number of arguments'),
        requiredArgument(args[1], 'wrong number of arguments')
      );
      return '0';
    case 'unset':
      return circuitFile.unsetVariable(requiredArgument(args[0], 'wrong number of arguments'))
        ? '0'
        : '';
  }
}

function compareVariableNames(leftName: string, rightName: string): number {
  if (leftName < rightName) {
    return -1;
  }

  if (leftName > rightName) {
    return 1;
  }

  return 0;
}

function isVariableSubcommand(value: string): value is VariableSubcommand {
  return SUBCOMMANDS.has(value as VariableSubcommand);
}

function requiredArgument(value: string | undefined, message: string): string {
  if (value === undefined) {
    throw new CircuitFileError(message);
  }

  return value;
}
