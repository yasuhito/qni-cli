import { AngleExpression, AngleExpressionError } from '../angle_expression';
import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { runRubyFallbackSync } from '../process/process_compatibility';

const FIXED_GATES = new Map<string, string>([
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

const ANGLED_GATES = new Map<string, string>([
  ['P', 'P'],
  ['RX', 'Rx'],
  ['RY', 'Ry'],
  ['RZ', 'Rz']
]);
const ANGLED_GATE_SYMBOLS = new Set(ANGLED_GATES.values());
const SWAP_GATE = 'Swap';

interface AddOptions {
  readonly angle?: string;
  readonly controls: number[];
  readonly qubits: number[];
  readonly step: number;
}

export function runAddCommand(argv: string[], context: CommandHandlerContext): number {
  if (!typeScriptAdd(argv)) {
    return runRubyFallbackSync({
      argv,
      cwd: context.cwd,
      env: context.env,
      projectRoot: context.projectRoot
    }).exitStatus ?? 1;
  }

  try {
    const gate = normalizedSupportedGate(argv[1]);
    const options = parseAddOptions(argv.slice(2));
    validateAngleUsage(gate, options);
    const circuitFile = currentCircuitFile(context.cwd);

    if (gate === SWAP_GATE) {
      if (controlled(options)) {
        throw new CircuitFileError('SWAP does not support --control yet');
      }

      circuitFile.addSwapGate(options.step, options.qubits);
    } else if (controlled(options)) {
      circuitFile.addControlledGate(serializedGate(gate, options), options.step, options.controls, singleQubit(options));
    } else {
      circuitFile.addGate(serializedGate(gate, options), options.step, singleQubit(options));
    }

    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function typeScriptAdd(argv: string[]): boolean {
  if (argv.length < 2) {
    return false;
  }

  if (argv[1] === '--help' || argv[1] === '-h') {
    return false;
  }

  if (!supportedGateName(argv[1])) {
    return false;
  }

  return knownAddOptionsOnly(argv.slice(2));
}

function normalizedSupportedGate(gate: string): string {
  const normalizedName = normalizedGateName(gate);
  const normalizedGate = normalizedGateSymbol(normalizedName);

  if (!normalizedGate) {
    throw new CircuitFileError(`unsupported gate: ${gate}`);
  }

  return normalizedGate;
}

function normalizedGateSymbol(normalizedName: string): string | undefined {
  return FIXED_GATES.get(normalizedName) ?? ANGLED_GATES.get(normalizedName) ?? swapGateSymbol(normalizedName);
}

function swapGateSymbol(normalizedName: string): string | undefined {
  return normalizedName === 'SWAP' ? SWAP_GATE : undefined;
}

function normalizedGateName(gate: string): string {
  return gate.toUpperCase();
}

function supportedGateName(gate: string): boolean {
  const normalizedName = normalizedGateName(gate);

  return FIXED_GATES.has(normalizedName) || ANGLED_GATES.has(normalizedName) || normalizedName === 'SWAP';
}

function knownAddOptionsOnly(args: string[]): boolean {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const match = /^--(?<name>angle|control|qubit|step)(?:=.*)?$/u.exec(arg);

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
    const match = /^--(?<name>angle|control|qubit|step)(?:=(?<value>.*))?$/u.exec(arg);

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
    angle: values.get('angle'),
    controls: optionalNonNegativeIntegers(values.get('control'), 'control'),
    qubits: requiredNonNegativeIntegers(values.get('qubit'), 'qubit'),
    step: requiredNonNegativeStep(values.get('step'))
  };
}

function singleQubit(options: AddOptions): number {
  if (options.qubits.length !== 1) {
    throw new CircuitFileError('qubit must contain exactly 1 index');
  }

  return options.qubits[0];
}

function controlled(options: AddOptions): boolean {
  return options.controls.length > 0;
}

function serializedGate(gate: string, options: AddOptions): string {
  if (!angledGate(gate)) {
    return gate;
  }

  try {
    return `${gate}(${new AngleExpression(requiredAngle(options, gate)).toString()})`;
  } catch (error) {
    if (error instanceof AngleExpressionError) {
      throw new CircuitFileError(error.message);
    }

    throw error;
  }
}

function validateAngleUsage(gate: string, options: AddOptions): void {
  if (options.angle && !angledGate(gate)) {
    throw new CircuitFileError('angle is only supported for P, Rx, Ry, and Rz');
  }
}

function requiredAngle(options: AddOptions, gate: string): string {
  if (!options.angle) {
    throw new CircuitFileError(`angle is required for ${gate}`);
  }

  return options.angle;
}

function angledGate(gate: string): boolean {
  return ANGLED_GATE_SYMBOLS.has(gate);
}

function requiredNonNegativeIntegers(value: string | undefined, name: string): number[] {
  if (!value) {
    throw new CircuitFileError(requiredOptionMessage(name));
  }

  return value.split(',').map((entry) => parseNonNegativeInteger(entry, name));
}

function optionalNonNegativeIntegers(value: string | undefined, name: string): number[] {
  if (!value) {
    return [];
  }

  return value.split(',').map((entry) => parseNonNegativeInteger(entry, name));
}

function requiredNonNegativeInteger(value: string | undefined, name: string): number {
  if (!value) {
    throw new CircuitFileError(requiredOptionMessage(name));
  }

  return parseNonNegativeInteger(value, name);
}

function requiredNonNegativeStep(value: string | undefined): number {
  if (!value) {
    throw new CircuitFileError(requiredOptionMessage('step'));
  }

  return parseNonNegativeNumericStep(value);
}

function requiredOptionMessage(name: string): string {
  return `No value provided for required options '--${name}'`;
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

function parseNonNegativeNumericStep(value: string): number {
  if (!/^[+-]?(?:\d+|\d+\.\d+|\.\d+)$/u.test(value)) {
    throw new CircuitFileError(`Expected numeric value for '--step'; got "${value}"`);
  }

  const parsedValue = Math.trunc(Number(value));

  if (parsedValue < 0) {
    throw new CircuitFileError('step must be >= 0');
  }

  return parsedValue;
}
