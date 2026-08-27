export class CircuitOperationError extends Error {}

export type CircuitOperationKind = 'gate' | 'measurement' | 'swap';

export interface ParsedCircuitOperation {
  readonly classicalCondition?: string;
  readonly kind: CircuitOperationKind;
  readonly measurementName?: string;
  readonly symbol: string;
}

const CLASSICAL_BIT_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const MEASURE_SYMBOL = 'Measure';
const SWAP_SYMBOL = 'Swap';

export function parseCircuitOperation(value: unknown): ParsedCircuitOperation {
  const serialized = String(value);
  const measurement = /^Measure(?:>(?<name>.*))?$/u.exec(serialized);

  if (measurement?.groups) {
    const name = measurement.groups.name;

    if (name !== undefined) {
      validateClassicalBitName(name);
    }

    return {
      kind: 'measurement',
      measurementName: name,
      symbol: MEASURE_SYMBOL
    };
  }

  if (serialized.startsWith(`${MEASURE_SYMBOL}>`) || serialized.includes('>')) {
    throw new CircuitOperationError(`invalid named measurement: ${serialized}`);
  }

  const conditionMatch = /^(?<symbol>.+)<(?<condition>.*)$/u.exec(serialized);
  const symbol = conditionMatch?.groups?.symbol ?? serialized;
  const classicalCondition = conditionMatch?.groups?.condition;

  if (classicalCondition !== undefined) {
    validateClassicalBitName(classicalCondition);
  }

  if (symbol.includes('<')) {
    throw new CircuitOperationError(`invalid classical condition: ${serialized}`);
  }

  return {
    classicalCondition,
    kind: symbol === SWAP_SYMBOL ? 'swap' : 'gate',
    symbol
  };
}

export function parseCircuitOperationSlot(value: unknown): ParsedCircuitOperation | undefined {
  return value === EMPTY_SLOT || value === CONTROL_SYMBOL ? undefined : parseCircuitOperation(value);
}

export function namedMeasurementSymbol(name: string | undefined): string {
  return name === undefined ? MEASURE_SYMBOL : `${MEASURE_SYMBOL}>${validateClassicalBitName(name)}`;
}

export function withClassicalCondition(symbol: string, condition: string | undefined): string {
  return condition === undefined ? symbol : `${symbol}<${validateClassicalBitName(condition)}`;
}

export function validateClassicalBitName(name: string): string {
  if (!CLASSICAL_BIT_NAME_PATTERN.test(name)) {
    throw new CircuitOperationError(`invalid classical bit name: ${name}`);
  }

  return name;
}
