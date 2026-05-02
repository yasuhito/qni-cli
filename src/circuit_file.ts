import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AngleExpression, AngleExpressionError, validAngleIdentifier } from './angle_expression';

export class CircuitFileError extends Error {}

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
