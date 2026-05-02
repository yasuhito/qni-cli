export class InitialStateError extends Error {}

const FORMAT = 'ket_sum_v1';
const SQRT_HALF_TEXT = Math.sqrt(0.5).toString();
const COMPUTATIONAL_BASIS_PATTERN = /^[01]+$/u;
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/u;
const SIGNED_IDENTIFIER_PATTERN = /^[+-][a-zA-Z_][a-zA-Z0-9_]*$/u;
const NUMERIC_PATTERN = /^[+-]?\d+(?:\.\d+)?$/u;
const IMAGINARY_NUMERIC_PATTERN = /^[+-]?\d+(?:\.\d+)?i$/u;
const BELL_BASES = new Set(['Φ+', 'Φ-', 'Ψ+', 'Ψ-']);

interface InitialStateTerm {
  readonly basis: string;
  readonly coefficient: string;
}

export function zeroInitialStateText(): string {
  return '1|0>';
}

export function formatInitialState(value: unknown): string {
  return formatTerms(loadTerms(value));
}

export function initialStateQubitCount(value: unknown): number {
  const terms = loadTerms(value);
  const basis = terms[0]?.basis;

  return basis ? qubitCount(basis) : 1;
}

function loadTerms(value: unknown): InitialStateTerm[] {
  if (!isRecord(value)) {
    throw new InitialStateError('initial state must be an object');
  }

  if (value.format !== FORMAT) {
    throw new InitialStateError(`unsupported initial state format: ${String(value.format)}`);
  }

  if (!Array.isArray(value.terms) || value.terms.length === 0) {
    throw new InitialStateError('initial state must have at least one term');
  }

  return normalizedTerms(value.terms.map(loadTerm));
}

function loadTerm(value: unknown): InitialStateTerm {
  if (!isRecord(value)) {
    throw new InitialStateError('initial state term must be an object');
  }

  return {
    basis: validatedBasis(value.basis),
    coefficient: validatedCoefficient(value.coefficient)
  };
}

function normalizedTerms(terms: InitialStateTerm[]): InitialStateTerm[] {
  validateUniqueBasis(terms);
  validateBasisDimensions(terms);

  return [...terms].sort((left, right) => compareText(left.basis, right.basis));
}

function validateUniqueBasis(terms: InitialStateTerm[]): void {
  const seen = new Set<string>();

  for (const term of terms) {
    if (seen.has(term.basis)) {
      throw new InitialStateError(`duplicate basis state: ${term.basis}`);
    }

    seen.add(term.basis);
  }
}

function validateBasisDimensions(terms: InitialStateTerm[]): void {
  const dimensions = new Set(terms.map((term) => qubitCount(term.basis)));

  if (dimensions.size > 1) {
    throw new InitialStateError('mixed basis dimensions are not supported');
  }
}

function validatedBasis(value: unknown): string {
  const basis = String(value);

  if (qubitCount(basis) > 0) {
    return basis;
  }

  throw new InitialStateError(`unsupported basis state: ${basis}`);
}

function qubitCount(basis: string): number {
  if (COMPUTATIONAL_BASIS_PATTERN.test(basis)) {
    return basis.length;
  }

  return BELL_BASES.has(basis) ? 2 : 0;
}

function validatedCoefficient(value: unknown): string {
  const coefficient = String(value).trim();

  if (supportedCoefficient(coefficient)) {
    return coefficient;
  }

  throw new InitialStateError(`invalid initial state coefficient: ${coefficient}`);
}

function supportedCoefficient(coefficient: string): boolean {
  return [
    IDENTIFIER_PATTERN,
    SIGNED_IDENTIFIER_PATTERN,
    NUMERIC_PATTERN,
    IMAGINARY_NUMERIC_PATTERN
  ].some((pattern) => pattern.test(coefficient));
}

function formatTerms(terms: InitialStateTerm[]): string {
  return oneQubitSpecialLabel(terms) ?? bellBasisLabel(terms) ?? ketSum(terms);
}

function oneQubitSpecialLabel(terms: InitialStateTerm[]): string | undefined {
  if (terms.length !== 2 || terms[0]?.basis !== '0' || terms[1]?.basis !== '1') {
    return undefined;
  }

  const coefficients = terms.map((term) => term.coefficient).join(',');
  const labels = new Map<string, string>([
    [`${SQRT_HALF_TEXT},${SQRT_HALF_TEXT}`, '|+>'],
    [`${SQRT_HALF_TEXT},-${SQRT_HALF_TEXT}`, '|->'],
    [`${SQRT_HALF_TEXT},${SQRT_HALF_TEXT}i`, '|+i>'],
    [`${SQRT_HALF_TEXT},-${SQRT_HALF_TEXT}i`, '|-i>']
  ]);

  return labels.get(coefficients);
}

function bellBasisLabel(terms: InitialStateTerm[]): string | undefined {
  const term = terms[0];

  if (terms.length === 1 && term?.coefficient === '1' && BELL_BASES.has(term.basis)) {
    return `|${term.basis}>`;
  }

  return undefined;
}

function ketSum(terms: InitialStateTerm[]): string {
  return terms.map((term) => `${term.coefficient}|${term.basis}>`).join(' + ').replaceAll('+ -', '- ');
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
