import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { runRubyFallbackSync } from '../process/process_compatibility';

const FIXED_SINGLE_QUBIT_GATES = new Map<string, string>([
  ['H', 'H'],
  ['S', 'S'],
  ['S†', 'S†'],
  ['T', 'T'],
  ['T†', 'T†'],
  ['X', 'X'],
  ['X^½', 'X^½'],
  ['Y', 'Y'],
  ['Z', 'Z'],
  ['√X', 'X^½']
]);

interface AddOptions {
  readonly qubit: number;
  readonly step: number;
}

export function runAddCommand(argv: string[], context: CommandHandlerContext): number {
  if (!fixedSingleQubitAdd(argv)) {
    return runRubyFallbackSync({
      argv,
      cwd: context.cwd,
      env: context.env,
      projectRoot: context.projectRoot
    }).exitStatus ?? 1;
  }

  try {
    const gate = normalizedFixedGate(argv[1]);
    const options = parseAddOptions(argv.slice(2));

    currentCircuitFile(context.cwd).addGate(gate, options.step, options.qubit);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function fixedSingleQubitAdd(argv: string[]): boolean {
  if (argv.length < 2) {
    return false;
  }

  if (argv[1] === '--help' || argv[1] === '-h') {
    return false;
  }

  if (!FIXED_SINGLE_QUBIT_GATES.has(normalizedGateName(argv[1]))) {
    return false;
  }

  return fixedAddOptionsOnly(argv.slice(2));
}

function normalizedFixedGate(gate: string): string {
  const normalizedGate = FIXED_SINGLE_QUBIT_GATES.get(normalizedGateName(gate));

  if (!normalizedGate) {
    throw new CircuitFileError(`unsupported gate: ${gate}`);
  }

  return normalizedGate;
}

function normalizedGateName(gate: string): string {
  return gate.toUpperCase();
}

function fixedAddOptionsOnly(args: string[]): boolean {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const match = /^--(?<name>qubit|step)(?:=.*)?$/u.exec(arg);

    if (arg.startsWith('--') && !match?.groups) {
      return false;
    }

    if (match?.groups && !arg.includes('=')) {
      index += 1;
    }
  }

  return true;
}

function parseAddOptions(args: string[]): AddOptions {
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
    qubit: requiredSingleNonNegativeInteger(values.get('qubit'), 'qubit'),
    step: requiredNonNegativeInteger(values.get('step'), 'step')
  };
}

function requiredSingleNonNegativeInteger(value: string | undefined, name: string): number {
  if (!value) {
    throw new CircuitFileError(`${name} is required`);
  }

  const values = value.split(',');

  if (values.length !== 1) {
    throw new CircuitFileError(`${name} must contain exactly 1 index`);
  }

  return parseNonNegativeInteger(values[0], name);
}

function requiredNonNegativeInteger(value: string | undefined, name: string): number {
  if (!value) {
    throw new CircuitFileError(`${name} is required`);
  }

  return parseNonNegativeInteger(value, name);
}

function parseNonNegativeInteger(value: string, name: string): number {
  if (!/^[+-]?\d+$/u.test(value)) {
    throw new CircuitFileError(`${name} must be an integer`);
  }

  const parsedValue = Number.parseInt(value, 10);

  if (parsedValue < 0) {
    throw new CircuitFileError(`${name} must be >= 0`);
  }

  return parsedValue;
}
