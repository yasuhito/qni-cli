import { AngleExpression, AngleExpressionError } from '../angle_expression';
import { Complex } from '../complex';
import type { CircuitData } from '../circuit_file';
import { InitialStateError, resolveNumericInitialState } from '../initial_state';
import { SimulatorError } from '../simulator';
import { BlochVector, type BlochVectorComponents } from './vector';

export interface BlochFrame {
  readonly vector: BlochVectorComponents;
}

type GateOperator = (zero: Complex, one: Complex) => [Complex, Complex];
type InterpolationMode = 'gates_only' | 'trajectory';

interface BlochRotation {
  readonly angle: number;
  readonly axis: BlochVectorComponents;
}

const EMPTY_SLOT = 1;
const H_SCALE = 1 / Math.sqrt(2);
const INTERMEDIATE_ROTATION_FRAMES = 12;

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

const DISPLAY_COORDINATE_FLIP: BlochVectorComponents = [1, -1, 1];
const FIXED_PHASE_ROTATION_ANGLES = new Set(['Z', 'S', 'S†', 'T', 'T†']);
const ANGLED_GATE_AXES = new Map<string, BlochVectorComponents>([
  ['P', [0, 0, 1]],
  ['Rx', [1, 0, 0]],
  ['Ry', [0, 1, 0]],
  ['Rz', [0, 0, 1]]
]);
const FIXED_BLOCH_ROTATIONS = new Map<string, BlochRotation>([
  ['H', { axis: [Math.sqrt(0.5), 0, Math.sqrt(0.5)], angle: Math.PI }],
  ['S', { axis: [0, 0, 1], angle: Math.PI / 2 }],
  ['S†', { axis: [0, 0, 1], angle: -(Math.PI / 2) }],
  ['T', { axis: [0, 0, 1], angle: Math.PI / 4 }],
  ['T†', { axis: [0, 0, 1], angle: -(Math.PI / 4) }],
  ['X', { axis: [1, 0, 0], angle: Math.PI }],
  ['Y', { axis: [0, 1, 0], angle: Math.PI }],
  ['Z', { axis: [0, 0, 1], angle: Math.PI }],
  ['√X', { axis: [1, 0, 0], angle: Math.PI / 2 }]
]);

export class BlochSampler {
  private readonly data: CircuitData;
  private readonly interpolation: InterpolationMode;

  constructor(data: CircuitData, interpolation: InterpolationMode) {
    this.data = data;
    this.interpolation = interpolation;
  }

  frames(): BlochFrame[] {
    try {
      this.assertSingleQubitCircuit();

      let currentState = this.startingState();
      const frames: BlochFrame[] = [{ vector: currentState.blochCoordinates() }];

      for (const col of this.data.cols) {
        if (col.every((slot) => slot === EMPTY_SLOT)) {
          continue;
        }

        frames.push(...this.sampleColFrames(currentState, col));
        currentState = this.stateAfterCol(currentState, col);
      }

      return frames;
    } catch (error) {
      if (error instanceof AngleExpressionError || error instanceof InitialStateError) {
        throw new SimulatorError(error.message);
      }

      throw error;
    }
  }

  private assertSingleQubitCircuit(): void {
    if (this.data.qubits !== 1) {
      throw new SimulatorError('bloch currently supports only 1-qubit circuits');
    }
  }

  private sampleColFrames(currentState: OneQubitState, col: readonly unknown[]): BlochFrame[] {
    const gate = col.length === 1 ? String(col[0]) : undefined;
    const rotation = gate ? this.interpolatedRotationFor(gate) : undefined;

    if (rotation) {
      return this.sampleRotationFrames(currentState, rotation);
    }

    return [{ vector: this.stateAfterCol(currentState, col).blochCoordinates() }];
  }

  private sampleRotationFrames(currentState: OneQubitState, rotation: BlochRotation): BlochFrame[] {
    const startVector = currentState.blochCoordinates();

    return Array.from({ length: INTERMEDIATE_ROTATION_FRAMES }, (_, index) => ({
      vector: new BlochVector(startVector)
        .rotate(rotation.axis, rotation.angle * (index + 1) / INTERMEDIATE_ROTATION_FRAMES)
        .toArray()
    }));
  }

  private startingState(): OneQubitState {
    if (this.data.initial_state == null) {
      return OneQubitState.zero();
    }

    const amplitudes = resolveNumericInitialState(this.data.initial_state, this.variables());
    return new OneQubitState(requiredAmplitude(amplitudes, 0), requiredAmplitude(amplitudes, 1));
  }

  private stateAfterCol(state: OneQubitState, col: readonly unknown[]): OneQubitState {
    return col.reduce<OneQubitState>((current, gate) => {
      if (gate === EMPTY_SLOT) {
        return current;
      }

      return current.apply(this.gateOperatorFor(gate));
    }, state);
  }

  private gateOperatorFor(gate: unknown): GateOperator {
    const gateName = String(gate);
    const fixedGate = FIXED_GATE_OPERATORS.get(gateName);

    if (fixedGate) {
      return fixedGate;
    }

    const angledGate = angledGateOperator(gateName, this.variables());

    if (angledGate) {
      return angledGate;
    }

    throw new SimulatorError(`unsupported gate for bloch sampling: ${JSON.stringify(gateName)}`);
  }

  private interpolatedRotationFor(gate: string): BlochRotation | undefined {
    const rotation = this.blochRotationFor(gate);

    if (!rotation) {
      return undefined;
    }

    if (this.interpolation === 'trajectory' || ANGLED_GATE_PATTERN.test(gate) || FIXED_PHASE_ROTATION_ANGLES.has(gate)) {
      return rotation;
    }

    return undefined;
  }

  private blochRotationFor(gate: string): BlochRotation | undefined {
    const angledRotation = angledBlochRotation(gate, this.variables());

    if (angledRotation) {
      return angledRotation;
    }

    const fixedRotation = FIXED_BLOCH_ROTATIONS.get(gate);

    if (!fixedRotation) {
      return undefined;
    }

    return {
      axis: displayAxis(fixedRotation.axis),
      angle: -fixedRotation.angle
    };
  }

  private variables(): Readonly<Record<string, string>> {
    return this.data.variables ?? {};
  }
}

class OneQubitState {
  private readonly one: Complex;
  private readonly zero: Complex;

  static zero(): OneQubitState {
    return new OneQubitState(new Complex(1), new Complex(0));
  }

  constructor(zero: Complex, one: Complex) {
    this.zero = zero;
    this.one = one;
  }

  apply(gateOperator: GateOperator): OneQubitState {
    const [zero, one] = gateOperator(this.zero, this.one);
    return new OneQubitState(zero, one);
  }

  blochCoordinates(): BlochVectorComponents {
    const product = this.zero.conjugate().multiply(this.one);

    return [
      realComponent(product.multiply(2)),
      imaginaryComponent(product.multiply(2)),
      this.zero.absSquared() - this.one.absSquared()
    ];
  }
}

const ANGLED_GATE_PATTERN = /^(?<gate>P|Rx|Ry|Rz)\((?<angle>.+)\)$/u;

function angledBlochRotation(
  serializedGate: string,
  variables: Readonly<Record<string, string>>
): BlochRotation | undefined {
  const match = ANGLED_GATE_PATTERN.exec(serializedGate);

  if (!match?.groups) {
    return undefined;
  }

  const axis = ANGLED_GATE_AXES.get(match.groups.gate ?? '');

  if (!axis) {
    return undefined;
  }

  return {
    axis: displayAxis(axis),
    angle: -new AngleExpression(match.groups.angle).radians(variables)
  };
}

function angledGateOperator(
  serializedGate: string,
  variables: Readonly<Record<string, string>>
): GateOperator | undefined {
  const match = ANGLED_GATE_PATTERN.exec(serializedGate);

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

function displayAxis(axis: BlochVectorComponents): BlochVectorComponents {
  return new BlochVector([
    axis[0] * DISPLAY_COORDINATE_FLIP[0],
    axis[1] * DISPLAY_COORDINATE_FLIP[1],
    axis[2] * DISPLAY_COORDINATE_FLIP[2]
  ]).normalized().toArray();
}

function realComponent(value: Complex): number {
  return value.real;
}

function imaginaryComponent(value: Complex): number {
  return value.imaginary;
}

function requiredAmplitude(amplitudes: readonly Complex[], index: number): Complex {
  const amplitude = amplitudes[index];

  if (!amplitude) {
    throw new SimulatorError(`state vector index out of range: ${index}`);
  }

  return amplitude;
}
