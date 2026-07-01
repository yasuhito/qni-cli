import { AngleExpression, AngleExpressionError } from '../angle_expression';
import { CircuitFileError, currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { thorArgumentsError } from './thor_compatibility';

const HELP_TEXT = `Usage:
  qni add GATE --qubit=N --step=N
  qni add GATE --control=CONTROL --qubit=N --step=N
  qni add ANGLED_GATE --angle=ANGLE --qubit=N --step=N
  qni add ANGLED_GATE --angle=ANGLE --control=CONTROL --qubit=N --step=N
  qni add SWAP --qubit=N,N --step=N

Overview:
  Add a gate to ./circuit.json.
  If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
  step and qubit are 0-based indices.
  Supported gates: H, X, Y, Z, S, S†, T, T†, √X, P, Rx, Ry, Rz, GlobalPhase, SWAP.
  With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
  CNOT is written as qni add X --control 0 --qubit 1 --step 0.
  ANGLED_GATE can be P, Rx, Ry, Rz, or GlobalPhase and is saved as GATE(angle).
  SWAP uses exactly two target qubits and writes "Swap" to both slots.

Options:
  --step=N             # 0-based step index
  --qubit=N            # 0-based qubit index
  [--control=CONTROL]  # comma-separated control qubit indices
  [--angle=ANGLE]      # angle for P, Rx, Ry, Rz, or GlobalPhase, such as π/3 or pi/3

Examples:
  qni add H --qubit 0 --step 0
  qni add X --qubit 1 --step 3
  qni add X --control 0 --qubit 1 --step 0
  qni add H --control 0 --qubit 2 --step 4
  qni add √X --qubit 0 --step 1
  qni add S† --qubit 1 --step 2
  qni add P --angle π/3 --qubit 0 --step 1
  qni add Rx --angle π/2 --qubit 0 --step 2
  qni add Rz --angle pi/4 --control 0 --qubit 1 --step 3
  qni add GlobalPhase --angle 2π --qubit 0 --step 4
  qni add SWAP --qubit 0,1 --step 0`;

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
  ['GLOBALPHASE', 'GlobalPhase'],
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
  if (argv.length === 1 || argv[1] === '--help' || argv[1] === '-h') {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    const gateArgument = argv[1] ?? '';
    const gate = normalizedSupportedGate(gateArgument);
    const options = parseAddOptions(gateArgument, argv.slice(2));
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

function parseAddOptions(gateArgument: string, args: string[]): AddOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const match = /^--(?<name>angle|control|qubit|step)(?:=(?<value>.*))?$/u.exec(arg);

    if (!match?.groups) {
      throw new CircuitFileError(thorArgumentsError('qni add', [gateArgument, arg], 'qni add GATE --qubit=N --step=N --qubit=QUBIT --step=N'));
    }

    const value = match.groups.value ?? args[index + 1];

    if (match.groups.value === undefined) {
      if (value === undefined || value.startsWith('--')) {
        throw new CircuitFileError(`No value provided for option '--${match.groups.name}'`);
      }
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
    throw new CircuitFileError('angle is only supported for P, Rx, Ry, Rz, and GlobalPhase');
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
