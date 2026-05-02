import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AngleExpression, AngleExpressionError, validAngleIdentifier } from './angle_expression';
import { formatInitialState, initialStateQubitCount, zeroInitialStateText } from './initial_state';

export class CircuitFileError extends Error {}

const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const SWAP_SYMBOL = 'Swap';

interface CircuitData {
  cols: unknown[][];
  initial_state?: unknown;
  qubits: number;
  variables?: Record<string, string>;
}

export class CircuitFile {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  clearVariables(): boolean {
    const circuit = this.existingCircuit();

    if (circuit) {
      circuit.variables = {};
      this.write(circuit);
      return true;
    }

    return false;
  }

  clearInitialState(): boolean {
    const circuit = this.existingCircuit();

    if (circuit) {
      validateInitialState(circuit);
      delete circuit.initial_state;
      this.write(circuit);
      return true;
    }

    return false;
  }

  initialStateText(): string {
    const circuit = this.existingCircuit();

    if (!circuit || circuit.initial_state == null) {
      return zeroInitialStateText();
    }

    return formatInitialState(circuit.initial_state);
  }

  slotText(step: number, qubit: number): string {
    const circuit = this.requiredCircuit();
    const col = circuit.cols[step];

    if (!col || qubit < 0 || qubit >= col.length) {
      throw new CircuitFileError(`slot does not exist: cols[${step}][${qubit}]`);
    }

    return String(col[qubit]);
  }

  removeGate(step: number, qubit: number): void {
    const circuit = this.requiredCircuit();
    const col = existingSlot(circuit, step, qubit);
    const selectedSlot = col[qubit];

    if (selectedSlot === EMPTY_SLOT) {
      throw new CircuitFileError(`slot is empty: cols[${step}][${qubit}]`);
    }

    for (const removableQubit of removableQubits(col, selectedSlot, step, qubit)) {
      col[removableQubit] = EMPTY_SLOT;
    }

    normalizeAfterRemoval(circuit);
    this.write(circuit);
  }

  setVariable(name: string, value: unknown): boolean {
    const circuit = this.requiredCircuit();
    const variables = circuit.variables ?? {};
    circuit.variables = {
      ...variables,
      [validateVariableName(name)]: canonicalVariableValue(value)
    };
    this.write(circuit);
    return true;
  }

  unsetVariable(name: string): boolean {
    const circuit = this.existingCircuit();

    if (circuit) {
      const variables = circuit.variables ?? {};
      delete variables[validateVariableName(name)];
      circuit.variables = variables;
      this.write(circuit);
      return true;
    }

    return false;
  }

  variables(): Record<string, string> {
    return this.existingCircuit()?.variables ?? {};
  }

  private existingCircuit(): CircuitData | undefined {
    try {
      return this.loadExistingCircuit();
    } catch (error) {
      throw domainError(error);
    }
  }

  private requiredCircuit(): CircuitData {
    const circuit = this.existingCircuit();

    if (!circuit) {
      throw new CircuitFileError('circuit.json does not exist');
    }

    return circuit;
  }

  private loadExistingCircuit(): CircuitData | undefined {
    let raw: string;

    try {
      raw = readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return undefined;
      }

      throw error;
    }

    return normalizeCircuit(JSON.parse(raw));
  }

  private write(circuit: CircuitData): void {
    const tempPath = `${this.filePath}.tmp`;

    try {
      writeFileSync(tempPath, `${JSON.stringify(serializedCircuit(circuit), null, 2)}\n`);
      renameSync(tempPath, this.filePath);
    } finally {
      rmSync(tempPath, { force: true });
    }
  }
}

function existingSlot(circuit: CircuitData, step: number, qubit: number): unknown[] {
  const col = circuit.cols[step];

  if (!col || qubit < 0 || qubit >= col.length) {
    throw new CircuitFileError(`slot does not exist: cols[${step}][${qubit}]`);
  }

  return col;
}

function removableQubits(
  col: unknown[],
  selectedSlot: unknown,
  step: number,
  qubit: number
): number[] {
  if (selectedSlot === SWAP_SYMBOL) {
    return swapQubits(col, step);
  }

  if (controlledSlot(col, selectedSlot, qubit)) {
    return controlledQubits(col, step);
  }

  return [qubit];
}

function controlledSlot(col: unknown[], selectedSlot: unknown, qubit: number): boolean {
  return col.includes(CONTROL_SYMBOL) && (selectedSlot === CONTROL_SYMBOL || targetQubits(col).includes(qubit));
}

function controlledQubits(col: unknown[], step: number): number[] {
  const targets = targetQubits(col);

  if (targets.length !== 1) {
    throw new CircuitFileError(`unsupported controlled step: cols[${step}] = ${JSON.stringify(col)}`);
  }

  return [...slotIndices(col, CONTROL_SYMBOL), ...targets];
}

function targetQubits(col: unknown[]): number[] {
  return col
    .map((slot, index) => ({ index, slot }))
    .filter(({ slot }) => slot !== EMPTY_SLOT && slot !== CONTROL_SYMBOL)
    .map(({ index }) => index);
}

function swapQubits(col: unknown[], step: number): number[] {
  const indices = slotIndices(col, SWAP_SYMBOL);

  if (indices.length !== 2) {
    throw new CircuitFileError(`unsupported swap step: cols[${step}] = ${JSON.stringify(col)}`);
  }

  return indices;
}

function slotIndices(col: unknown[], symbol: string): number[] {
  return col
    .map((slot, index) => ({ index, slot }))
    .filter(({ slot }) => slot === symbol)
    .map(({ index }) => index);
}

function normalizeAfterRemoval(circuit: CircuitData): void {
  trimLeadingEmptySteps(circuit);
  trimLeadingEmptyQubits(circuit);
  trimTrailingEmptyQubits(circuit);
}

function trimLeadingEmptySteps(circuit: CircuitData): void {
  while (circuit.cols.length > 1 && emptyCol(circuit.cols[0])) {
    circuit.cols.shift();
  }
}

function trimLeadingEmptyQubits(circuit: CircuitData): void {
  const count = leadingEmptyQubitCount(circuit);

  if (count > 0) {
    circuit.cols.forEach((col) => col.splice(0, count));
    circuit.qubits -= count;
  }
}

function trimTrailingEmptyQubits(circuit: CircuitData): void {
  const count = trailingEmptyQubitCount(circuit);

  if (count > 0) {
    circuit.cols.forEach((col) => col.splice(circuit.qubits - count, count));
    circuit.qubits -= count;
  }
}

function leadingEmptyQubitCount(circuit: CircuitData): number {
  let count = 0;

  while (count < removableQubitsLimit(circuit) && circuit.cols.every((col) => col[count] === EMPTY_SLOT)) {
    count += 1;
  }

  return count;
}

function trailingEmptyQubitCount(circuit: CircuitData): number {
  let count = 0;

  while (
    count < removableQubitsLimit(circuit) &&
    circuit.cols.every((col) => col[circuit.qubits - count - 1] === EMPTY_SLOT)
  ) {
    count += 1;
  }

  return count;
}

function removableQubitsLimit(circuit: CircuitData): number {
  return circuit.qubits - minimumQubits(circuit);
}

function minimumQubits(circuit: CircuitData): number {
  return circuit.initial_state == null ? 1 : initialStateQubitCount(circuit.initial_state);
}

function emptyCol(col: unknown[] | undefined): boolean {
  return Boolean(col?.every((slot) => slot === EMPTY_SLOT));
}

function validateInitialState(circuit: CircuitData): void {
  if (circuit.initial_state != null) {
    formatInitialState(circuit.initial_state);
  }
}

export function currentCircuitFile(cwd: string): CircuitFile {
  return new CircuitFile(path.resolve(cwd, 'circuit.json'));
}

function normalizeCircuit(value: unknown): CircuitData {
  if (!isRecord(value)) {
    throw new CircuitFileError('circuit must be an object');
  }

  const qubits = normalizeQubits(value.qubits);

  return {
    cols: normalizeCols(value.cols, qubits),
    initial_state: value.initial_state,
    qubits,
    variables: normalizeVariables(value.variables ?? {})
  };
}

function normalizeQubits(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new CircuitFileError('qubits must be a positive integer');
  }

  return value;
}

function normalizeCols(value: unknown, qubits: number): unknown[][] {
  if (!Array.isArray(value)) {
    throw new CircuitFileError('cols must be an array');
  }

  if (!value.every((col) => Array.isArray(col) && col.length === qubits)) {
    throw new CircuitFileError('each column in cols must have exactly qubits entries');
  }

  return value.map((col) => [...col]);
}

function normalizeVariables(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    throw new CircuitFileError('variables must be an object');
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, variableValue]) => [
      validateVariableName(name),
      canonicalVariableValue(variableValue)
    ])
  );
}

function serializedCircuit(circuit: CircuitData): Record<string, unknown> {
  const result: Record<string, unknown> = {
    qubits: circuit.qubits,
    cols: circuit.cols
  };

  if (circuit.initial_state != null) {
    result.initial_state = circuit.initial_state;
  }

  if (circuit.variables && Object.keys(circuit.variables).length > 0) {
    result.variables = circuit.variables;
  }

  return result;
}

function validateVariableName(name: string): string {
  if (name.length === 0) {
    throw new CircuitFileError('variable name is required');
  }

  if (!validAngleIdentifier(name)) {
    throw new CircuitFileError(`invalid variable name: ${name}`);
  }

  return name;
}

function canonicalVariableValue(value: unknown): string {
  try {
    const angle = new AngleExpression(value);

    if (!angle.concrete()) {
      throw new CircuitFileError(`variable value must be concrete: ${value}`);
    }

    return angle.toString();
  } catch (error) {
    if (error instanceof AngleExpressionError) {
      throw new CircuitFileError(error.message);
    }

    throw error;
  }
}

function domainError(error: unknown): CircuitFileError {
  return error instanceof CircuitFileError
    ? error
    : new CircuitFileError(error instanceof Error ? error.message : String(error));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
