import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';

const HELP_TEXT = `Usage:
  qni gate --qubit=N --step=N

Overview:
  Print one serialized cell value from ./circuit.json.
  step and qubit are 0-based indices.
  If the cell contains "H", qni gate prints H.

Options:
  --step=N   # 0-based step index
  --qubit=N  # 0-based qubit index

Examples:
  qni gate --qubit 0 --step 0`;

interface GateOptions {
  readonly qubit: number;
  readonly step: number;
}

export function runGateCommand(argv: string[], context: CommandHandlerContext): number {
  try {
    if (argv.length === 1 || argv[1] === '--help' || argv[1] === '-h') {
      process.stdout.write(`${HELP_TEXT}\n`);
      return 0;
    }

    const options = parseGateOptions(argv.slice(1));
    process.stdout.write(`${currentCircuitFile(context.cwd).slotText(options.step, options.qubit)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseGateOptions(args: string[]): GateOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const match = /^--(?<name>qubit|step)(?:=(?<value>.*))?$/u.exec(arg);

    if (!match?.groups) {
      throw new CircuitFileError(`unknown option: ${arg}`);
    }

    const value = match.groups.value ?? args[index + 1];

    if (match.groups.value === undefined) {
      index += 1;
    }

    values.set(match.groups.name, value ?? '');
  }

  return {
    qubit: requiredNonNegativeInteger(values.get('qubit'), 'qubit'),
    step: requiredNonNegativeInteger(values.get('step'), 'step')
  };
}

function requiredNonNegativeInteger(value: string | undefined, name: string): number {
  if (!value) {
    throw new CircuitFileError(`${name} is required`);
  }

  if (!/^[+-]?\d+$/u.test(value)) {
    throw new CircuitFileError(`${name} must be an integer`);
  }

  const parsedValue = Number.parseInt(value, 10);

  if (parsedValue < 0) {
    throw new CircuitFileError(`${name} must be >= 0`);
  }

  return parsedValue;
}
