import { AngleExpression, AngleExpressionError } from './angle_expression';
import { Complex } from './complex';
import type { CircuitData } from './circuit_file';
import { InitialStateError, initialStateQubitCount, resolveNumericInitialState } from './initial_state';

export class SimulatorError extends Error {}

export interface StateVectorExportPayload {
  readonly amplitudes: readonly StateVectorExportedAmplitude[];
  readonly qubits: number;
}

export interface StateVectorExportedAmplitude {
  readonly imag: number;
  readonly real: number;
}

type GateOperator = (zero: Complex, one: Complex) => [Complex, Complex];

const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const H_SCALE = 1 / Math.sqrt(2);
const MAX_IN_MEMORY_QUBITS = 30;
const SWAP_SYMBOL = 'Swap';

const FIXED_GATE_OPERATORS = new Map<string, GateOperator>([
  ['H', (zero, one) => [zero.add(one).multiply(H_SCALE), zero.subtract(one).multiply(H_SCALE)]],
  ['S', (zero, one) => [zero, new Complex(0, 1).multiply(one)]],
  ['S†', (zero, one) => [zero, new Complex(0, -1).multiply(one)]],
  ['T', phaseGate(Math.PI / 4)],
  ['T†', phaseGate(-Math.PI / 4)],
  ['X', (zero, one) => [one, zero]],
  [
    'X^½',
    (zero, one) => [
      new Complex(0.5, 0.5).multiply(zero).add(new Complex(0.5, -0.5).multiply(one)),
      new Complex(0.5, -0.5).multiply(zero).add(new Complex(0.5, 0.5).multiply(one))
    ]
  ],
  ['Y', (zero, one) => [new Complex(0, -1).multiply(one), new Complex(0, 1).multiply(zero)]],
  ['Z', (zero, one) => [zero, one.multiply(-1)]]
]);

export class Simulator {
  private readonly data: CircuitData;

  constructor(data: CircuitData) {
    this.data = data;
  }

  renderStateVector(): string {
    return this.stateVector().toCsv();
  }

  renderExpectationValues(pauliStrings: readonly string[]): string {
    const stateVector = this.stateVector();

    return pauliStrings
      .map((pauliString) => `${pauliString}=${StateVector.formatAmplitude(stateVector.expectation(pauliString))}`)
      .join('\n');
  }

  exportPayload(): StateVectorExportPayload {
    return this.stateVector().exportPayload();
  }

  private stateVector(): StateVector {
    try {
      ensureSupportedQubitCount(this.data.qubits);

      return this.data.cols.reduce(
        (current, col) => new StepOperation(col, this.gateOperatorFor.bind(this)).apply(current),
        this.startingStateVector()
      );
    } catch (error) {
      if (
        error instanceof AngleExpressionError ||
        error instanceof InitialStateError ||
        error instanceof PauliStringError
      ) {
        throw new SimulatorError(error.message);
      }

      throw error;
    }
  }

  private startingStateVector(): StateVector {
    if (this.data.initial_state == null) {
      return StateVector.zero(this.data.qubits);
    }

    const initialQubits = initialStateQubitCount(this.data.initial_state);
    ensureInitialStateFitsCircuit(initialQubits, this.data.qubits);

    return new StateVector(
      this.data.qubits,
      expandInitialState(
        resolveNumericInitialState(this.data.initial_state, this.variables()),
        initialQubits,
        this.data.qubits
      )
    );
  }

  private gateOperatorFor(gate: unknown): GateOperator {
    const gateName = String(gate);
    const fixedGate = FIXED_GATE_OPERATORS.get(gateName);

    if (fixedGate) {
      return fixedGate;
    }

    const angledGate = angledGateOperator(gateName, this.variables());

    if (!angledGate) {
      throw new SimulatorError(`unsupported gate for run: ${JSON.stringify(gateName)}`);
    }

    return angledGate;
  }

  private variables(): Readonly<Record<string, string>> {
    return this.data.variables ?? {};
  }
}

class StateVector {
  private readonly amplitudes: readonly Complex[];
  private readonly qubits: number;

  static zero(qubits: number): StateVector {
    const amplitudes = Array.from({ length: stateVectorSize(qubits) }, () => new Complex(0));
    amplitudes[0] = new Complex(1);

    return new StateVector(qubits, amplitudes, false);
  }

  static formatAmplitude(amplitude: Complex): string {
    const real = normalizedScalar(amplitude.real);
    const imaginary = normalizedScalar(amplitude.imaginary);

    if (imaginary === 0) {
      return formatRubyFloat(real);
    }

    if (real === 0) {
      return `${formatRubyFloat(imaginary)}i`;
    }

    return `${formatRubyFloat(real)}${imaginary > 0 ? '+' : ''}${formatRubyFloat(imaginary)}i`;
  }

  constructor(qubits: number, amplitudes: readonly Complex[], copy = true) {
    this.qubits = qubits;
    this.amplitudes = copy ? [...amplitudes] : amplitudes;
  }

  applySingleQubitGate(qubit: number, gateOperator: GateOperator): StateVector {
    return this.applyGateLayout(new SingleQubitGateLayout(this.qubits, qubit, gateOperator));
  }

  applyControlledSingleQubitGate(
    controls: readonly number[],
    qubit: number,
    gateOperator: GateOperator
  ): StateVector {
    return this.applyGateLayout(new ControlledSingleQubitGateLayout(this.qubits, qubit, controls, gateOperator));
  }

  applySwap(firstQubit: number, secondQubit: number): StateVector {
    const firstMask = bitMask(this.qubits, firstQubit);
    const secondMask = bitMask(this.qubits, secondQubit);
    const result = Array.from({ length: this.amplitudes.length }, () => new Complex(0));

    this.amplitudes.forEach((amplitude, index) => {
      const destination =
        bitSet(index, firstMask) === bitSet(index, secondMask) ? index : index ^ firstMask ^ secondMask;
      result[destination] = amplitude;
    });

    return new StateVector(this.qubits, result, false);
  }

  expectation(pauliString: string): Complex {
    const observable = new PauliString(pauliString, this.qubits);

    return this.amplitudes.reduce((sum, amplitude, index) => {
      const mapped = observable.mappedState(index);
      return sum.add(amplitude.conjugate().multiply(mapped.phase).multiply(this.amplitudes[mapped.index]));
    }, new Complex(0));
  }

  toCsv(): string {
    return this.amplitudes.map((amplitude) => StateVector.formatAmplitude(amplitude)).join(',');
  }

  exportPayload(): StateVectorExportPayload {
    return {
      amplitudes: this.amplitudes.map((amplitude) => ({
        imag: normalizedScalar(amplitude.imaginary),
        real: normalizedScalar(amplitude.real)
      })),
      qubits: this.qubits
    };
  }

  private applyGateLayout(layout: SingleQubitGateLayout): StateVector {
    const result = [...this.amplitudes];

    for (let blockIndex = 0; blockIndex < this.amplitudes.length / layout.blockSize; blockIndex += 1) {
      layout.applyBlock(result, this.amplitudes, blockIndex * layout.blockSize);
    }

    return new StateVector(this.qubits, result, false);
  }
}

class SingleQubitGateLayout {
  readonly blockSize: number;
  protected readonly gateOperator: GateOperator;
  protected readonly qubits: number;
  protected readonly stride: number;

  constructor(qubits: number, qubit: number, gateOperator: GateOperator) {
    this.qubits = qubits;
    this.stride = 1 << (qubits - qubit - 1);
    this.blockSize = this.stride * 2;
    this.gateOperator = gateOperator;
  }

  applyBlock(result: Complex[], source: readonly Complex[], baseIndex: number): void {
    this.eachTransformedPair(source, baseIndex, (zeroIndex, transformed) => {
      result[zeroIndex] = transformed[0];
      result[zeroIndex + this.stride] = transformed[1];
    });
  }

  protected eachTransformedPair(
    source: readonly Complex[],
    baseIndex: number,
    callback: (zeroIndex: number, transformed: [Complex, Complex]) => void
  ): void {
    for (let offset = 0; offset < this.stride; offset += 1) {
      const zeroIndex = baseIndex + offset;
      callback(
        zeroIndex,
        this.gateOperator(requiredAmplitude(source, zeroIndex), requiredAmplitude(source, zeroIndex + this.stride))
      );
    }
  }
}

class ControlledSingleQubitGateLayout extends SingleQubitGateLayout {
  private readonly controls: readonly number[];

  constructor(qubits: number, qubit: number, controls: readonly number[], gateOperator: GateOperator) {
    super(qubits, qubit, gateOperator);
    this.controls = controls;
  }

  override applyBlock(result: Complex[], source: readonly Complex[], baseIndex: number): void {
    this.eachTransformedPair(source, baseIndex, (zeroIndex, transformed) => {
      if (!this.controlsActive(zeroIndex)) {
        return;
      }

      result[zeroIndex] = transformed[0];
      result[zeroIndex + this.stride] = transformed[1];
    });
  }

  private controlsActive(zeroIndex: number): boolean {
    return this.controls.every((control) => bitSet(zeroIndex, bitMask(this.qubits, control)));
  }
}

class StepOperation {
  private readonly col: readonly unknown[];
  private readonly gateOperatorFor: (gate: unknown) => GateOperator;

  constructor(col: readonly unknown[], gateOperatorFor: (gate: unknown) => GateOperator) {
    this.col = col;
    this.gateOperatorFor = gateOperatorFor;
  }

  apply(stateVector: StateVector): StateVector {
    if (this.swap()) {
      return this.applySwap(stateVector);
    }

    if (this.controlled()) {
      return this.applyControlled(stateVector);
    }

    return this.applyUncontrolled(stateVector);
  }

  private applySwap(stateVector: StateVector): StateVector {
    if (!this.validSwapStep()) {
      throw new SimulatorError(`unsupported swap step: ${JSON.stringify(this.col)}`);
    }

    const swapQubits = this.slotIndices(SWAP_SYMBOL);
    return stateVector.applySwap(swapQubits[0] ?? 0, swapQubits[1] ?? 0);
  }

  private applyControlled(stateVector: StateVector): StateVector {
    const target = this.target();

    return stateVector.applyControlledSingleQubitGate(
      this.slotIndices(CONTROL_SYMBOL),
      target.qubit,
      this.gateOperatorFor(target.gate)
    );
  }

  private applyUncontrolled(stateVector: StateVector): StateVector {
    return this.col.reduce<StateVector>((current, gate, qubit) => {
      if (gate === EMPTY_SLOT) {
        return current;
      }

      return current.applySingleQubitGate(qubit, this.gateOperatorFor(gate));
    }, stateVector);
  }

  private target(): { gate: unknown; qubit: number } {
    const targets = this.col
      .map((gate, qubit) => ({ gate, qubit }))
      .filter(({ gate }) => gate !== EMPTY_SLOT && gate !== CONTROL_SYMBOL);

    if (targets.length !== 1) {
      throw new SimulatorError(`unsupported controlled step: ${JSON.stringify(this.col)}`);
    }

    return targets[0] as { gate: unknown; qubit: number };
  }

  private swap(): boolean {
    return this.col.includes(SWAP_SYMBOL);
  }

  private controlled(): boolean {
    return this.col.includes(CONTROL_SYMBOL);
  }

  private validSwapStep(): boolean {
    return this.slotIndices(SWAP_SYMBOL).length === 2 && this.col.every((slot) => slot === EMPTY_SLOT || slot === SWAP_SYMBOL);
  }

  private slotIndices(symbol: string): number[] {
    return this.col
      .map((slot, index) => ({ index, slot }))
      .filter(({ slot }) => slot === symbol)
      .map(({ index }) => index);
  }
}

class PauliStringError extends Error {}

class PauliString {
  private readonly qubits: number;
  private readonly symbols: readonly string[];

  constructor(rawValue: string, qubits: number) {
    this.symbols = rawValue.toUpperCase().split('');
    this.qubits = qubits;
    this.ensureValid(rawValue.toUpperCase());
  }

  mappedState(index: number): { index: number; phase: Complex } {
    return this.symbols.reduce(
      (current, symbol, qubit) => this.transform(current, symbol, qubit),
      { index, phase: new Complex(1) }
    );
  }

  private ensureValid(rawValue: string): void {
    if (this.symbols.length !== this.qubits) {
      throw new PauliStringError(`Pauli string length must match qubit count: ${rawValue}`);
    }

    if (!this.symbols.every((symbol) => ['I', 'X', 'Y', 'Z'].includes(symbol))) {
      throw new PauliStringError(`Pauli string must use only I, X, Y, and Z: ${rawValue}`);
    }
  }

  private transform(
    state: { index: number; phase: Complex },
    symbol: string,
    qubit: number
  ): { index: number; phase: Complex } {
    const mask = bitMask(this.qubits, qubit);

    switch (symbol) {
      case 'I':
        return state;
      case 'X':
        return { index: state.index ^ mask, phase: state.phase };
      case 'Y':
        return {
          index: state.index ^ mask,
          phase: state.phase.multiply(bitSet(state.index, mask) ? new Complex(0, -1) : new Complex(0, 1))
        };
      case 'Z':
        return { index: state.index, phase: state.phase.multiply(bitSet(state.index, mask) ? -1 : 1) };
      default:
        throw new PauliStringError(`Pauli string must use only I, X, Y, and Z: ${this.symbols.join('')}`);
    }
  }
}

function angledGateOperator(
  serializedGate: string,
  variables: Readonly<Record<string, string>>
): GateOperator | undefined {
  const match = /^(?<gate>P|Rx|Ry|Rz)\((?<angle>.+)\)$/u.exec(serializedGate);

  if (!match?.groups) {
    return undefined;
  }

  const angle = new AngleExpression(match.groups.angle).radians(variables);

  switch (match.groups.gate) {
    case 'P':
      return phaseGate(angle);
    case 'Rx':
      return rxGate(angle);
    case 'Ry':
      return ryGate(angle);
    case 'Rz':
      return rzGate(angle);
    default:
      return undefined;
  }
}

function phaseGate(angle: number): GateOperator {
  const phase = new Complex(Math.cos(angle), Math.sin(angle));

  return (zero, one) => [zero, phase.multiply(one)];
}

function rxGate(angle: number): GateOperator {
  const halfAngle = angle / 2;
  const cosine = Math.cos(halfAngle);
  const imaginarySine = new Complex(0, Math.sin(halfAngle));

  return (zero, one) => [
    zero.multiply(cosine).subtract(imaginarySine.multiply(one)),
    imaginarySine.multiply(zero).multiply(-1).add(one.multiply(cosine))
  ];
}

function ryGate(angle: number): GateOperator {
  const halfAngle = angle / 2;
  const cosine = Math.cos(halfAngle);
  const sine = Math.sin(halfAngle);

  return (zero, one) => [
    zero.multiply(cosine).subtract(one.multiply(sine)),
    zero.multiply(sine).add(one.multiply(cosine))
  ];
}

function rzGate(angle: number): GateOperator {
  const halfAngle = angle / 2;
  const negativePhase = new Complex(Math.cos(halfAngle), -Math.sin(halfAngle));
  const positivePhase = new Complex(Math.cos(halfAngle), Math.sin(halfAngle));

  return (zero, one) => [negativePhase.multiply(zero), positivePhase.multiply(one)];
}

function requiredAmplitude(amplitudes: readonly Complex[], index: number): Complex {
  const amplitude = amplitudes[index];

  if (!amplitude) {
    throw new SimulatorError(`state vector index out of range: ${index}`);
  }

  return amplitude;
}

function expandInitialState(
  amplitudes: readonly Complex[],
  initialQubits: number,
  circuitQubits: number
): readonly Complex[] {
  if (initialQubits === circuitQubits) {
    return amplitudes;
  }

  const suffixStates = stateVectorSize(circuitQubits - initialQubits);
  const expanded = Array.from({ length: stateVectorSize(circuitQubits) }, () => new Complex(0));

  amplitudes.forEach((amplitude, index) => {
    expanded[index * suffixStates] = amplitude;
  });

  return expanded;
}

function ensureInitialStateFitsCircuit(initialQubits: number, circuitQubits: number): void {
  if (initialQubits > circuitQubits) {
    throw new SimulatorError('initial state qubit count cannot exceed circuit qubit count');
  }
}

function ensureSupportedQubitCount(qubits: number): void {
  if (!Number.isInteger(qubits) || qubits < 0) {
    throw new SimulatorError(`invalid qubit count for run: ${qubits}`);
  }

  if (qubits > MAX_IN_MEMORY_QUBITS) {
    throw new SimulatorError(`too many qubits for TypeScript numeric run: ${qubits}`);
  }
}

function stateVectorSize(qubits: number): number {
  ensureSupportedQubitCount(qubits);
  return 2 ** qubits;
}

function bitMask(qubits: number, qubit: number): number {
  return 1 << (qubits - qubit - 1);
}

function bitSet(value: number, mask: number): boolean {
  return (value & mask) !== 0;
}

function normalizedScalar(value: number): number {
  if (Math.abs(value) < Number.EPSILON) {
    return 0;
  }

  const nearestInteger = Math.round(value);
  return Math.abs(value - nearestInteger) <= Number.EPSILON ? nearestInteger : value;
}

function formatRubyFloat(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}.0`;
  }

  return String(value);
}
