import type { CircuitData } from "../circuit_file";
import { parseInitialState } from "../initial_state";
import { circuitContainsMeasurements, Simulator } from "../simulator";
import type { ComplexAmplitude } from "./benchmark_task";

const MAX_UNITARY_QUBITS = 8;
const MAX_DETAILS = 16;

export interface UnitaryMismatch {
  readonly input: string;
  readonly output: string;
  readonly expected: ComplexAmplitude;
  readonly actual: ComplexAmplitude;
}

export interface ReferenceCircuitComparison {
  readonly status: "passed" | "failed";
  readonly reason?: string;
  readonly mismatches: {
    readonly displayed: readonly UnitaryMismatch[];
    readonly omittedCount: number;
  };
}

export function validateUnitaryTolerance(tolerance: number): void {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error(
      "unitary checks.tolerance must be a finite non-negative number"
    );
  }
}

export function validateReferenceCircuit(circuit: CircuitData): void {
  validateUnitaryCircuit(circuit, "reference");
}

function validateUnitaryCircuit(circuit: CircuitData, side: string): void {
  if (
    !Number.isInteger(circuit.qubits) ||
    circuit.qubits < 1 ||
    circuit.qubits > MAX_UNITARY_QUBITS
  ) {
    throw new Error(
      `${side} unitary circuit must have 1..${MAX_UNITARY_QUBITS} qubits`
    );
  }
  if (circuitContainsMeasurements(circuit)) {
    throw new Error(
      `${side} unitary circuit must not contain measurements or classical conditions`
    );
  }
  // Stored initial states are not part of the transformation being graded.
  new Simulator({
    ...circuit,
    initial_state: undefined,
  }).validateStateVectorInput();
}

/** Compares all basis inputs using one common matrix-wide phase, without mutating either circuit. */
export function compareReferenceCircuit(
  actual: CircuitData,
  reference: CircuitData,
  tolerance: number,
  upToGlobalPhase = false
): ReferenceCircuitComparison {
  validateUnitaryTolerance(tolerance);
  validateUnitaryCircuit(reference, "reference");
  validateUnitaryCircuit(actual, "submitted");
  if (actual.qubits !== reference.qubits) {
    return {
      status: "failed",
      reason: `qubit count mismatch: submitted ${actual.qubits}, reference ${reference.qubits}`,
      mismatches: { displayed: [], omittedCount: 0 },
    };
  }
  const expectedColumns = unitaryColumns(reference);
  const actualColumns = unitaryColumns(actual);
  const phase = upToGlobalPhase
    ? matrixPhase(actualColumns, expectedColumns)
    : { real: 1, imaginary: 0 };
  const displayed: UnitaryMismatch[] = [];
  let count = 0;
  for (const [input, column] of expectedColumns.entries()) {
    for (const [output, amplitude] of column.entries()) {
      const expected = multiply(amplitude, phase);
      const measured = actualColumns[input][output];
      if (
        Math.abs(measured.real - expected.real) <= tolerance &&
        Math.abs(measured.imaginary - expected.imaginary) <= tolerance
      ) {
        continue;
      }
      count += 1;
      if (displayed.length < MAX_DETAILS) {
        displayed.push({
          input: basis(input, reference.qubits),
          output: basis(output, reference.qubits),
          expected,
          actual: measured,
        });
      }
    }
  }
  return {
    status: count === 0 ? "passed" : "failed",
    mismatches: { displayed, omittedCount: count - displayed.length },
  };
}

function unitaryColumns(circuit: CircuitData): ComplexAmplitude[][] {
  return Array.from({ length: 2 ** circuit.qubits }, (_, input) => {
    const payload = new Simulator({
      ...circuit,
      initial_state: parseInitialState(`1${basis(input, circuit.qubits)}`),
    }).exportPayload();
    return payload.amplitudes.map(({ real, imag }) => {
      if (!Number.isFinite(real) || !Number.isFinite(imag)) {
        throw new Error("unitary circuit produced a non-finite amplitude");
      }
      return { real, imaginary: imag };
    });
  });
}

function basis(index: number, qubits: number): string {
  return `|${index.toString(2).padStart(qubits, "0")}>`;
}

function matrixPhase(
  actual: ComplexAmplitude[][],
  expected: ComplexAmplitude[][]
): ComplexAmplitude {
  let largest = 0;
  let pivotInput = 0;
  let pivotOutput = 0;
  for (const [input, column] of expected.entries()) {
    for (const [output, value] of column.entries()) {
      const magnitude = Math.hypot(value.real, value.imaginary);
      if (magnitude > largest) {
        largest = magnitude;
        pivotInput = input;
        pivotOutput = output;
      }
    }
  }
  const measured = actual[pivotInput][pivotOutput];
  const magnitude = Math.hypot(measured.real, measured.imaginary);
  if (largest === 0 || magnitude === 0) {
    return { real: 1, imaginary: 0 };
  }
  const target = expected[pivotInput][pivotOutput];
  return multiply(
    {
      real: measured.real / magnitude,
      imaginary: measured.imaginary / magnitude,
    },
    { real: target.real / largest, imaginary: -target.imaginary / largest }
  );
}

function multiply(a: ComplexAmplitude, b: ComplexAmplitude): ComplexAmplitude {
  return {
    real: a.real * b.real - a.imaginary * b.imaginary,
    imaginary: a.real * b.imaginary + a.imaginary * b.real,
  };
}
