export class AngleExpressionError extends Error {}

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/u;
const NUMERIC_PATTERN = /^[+-]?\d+(?:\.\d+)?$/u;
const MULTIPLIED_PATTERN = /^(?<coefficient>[+-]?\d+(?:\.\d+)?)\*(?<term>.+)$/u;
const PI_PATTERN =
  /^(?<sign>[+-]?)(?:(?<coefficient>\d+(?:\.\d+)?)(?:\*)?)?(?:π|pi)(?:(?:\/|_)(?<denominator>\d+(?:\.\d+)?))?$/u;
const SIGNED_IDENTIFIER_PATTERN = /^(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)$/u;

export function validAngleIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value);
}

interface AngleTerm {
  readonly concrete: boolean;
  readonly text: string;
}

export class AngleExpression {
  private readonly rawValue: unknown;

  constructor(rawValue: unknown) {
    this.rawValue = rawValue;
  }

  concrete(): boolean {
    return this.parse().concrete;
  }

  toString(): string {
    return this.parse().text;
  }

  private normalized(): string {
    const value = String(this.rawValue)
      .replaceAll(' ', '')
      .replaceAll('θ', 'theta')
      .replace(/(?<=\d)theta/gu, '*theta');

    if (value.length === 0) {
      throw new AngleExpressionError('angle is required');
    }

    return value;
  }

  parse(): AngleTerm {
    const value = this.normalized();
    const term = parseAngleTerm(value);

    if (!term) {
      throw new AngleExpressionError(`invalid angle: ${value}`);
    }

    return term;
  }
}

function parseAngleTerm(value: string): AngleTerm | undefined {
  return (
    parseNumericLiteral(value) ??
    parseSignedIdentifier(value) ??
    parseVariableReference(value) ??
    parsePiTerm(value) ??
    parseProduct(value)
  );
}

function parseNumericLiteral(value: string): AngleTerm | undefined {
  if (!NUMERIC_PATTERN.test(value)) {
    return undefined;
  }

  return { concrete: true, text: value };
}

function parseSignedIdentifier(value: string): AngleTerm | undefined {
  const match = SIGNED_IDENTIFIER_PATTERN.exec(value);

  if (!match?.groups) {
    return undefined;
  }

  const identifier = match.groups.identifier ?? '';
  return {
    concrete: false,
    text: match.groups.sign === '-' ? `-${identifier}` : identifier
  };
}

function parseVariableReference(value: string): AngleTerm | undefined {
  if (!IDENTIFIER_PATTERN.test(value)) {
    return undefined;
  }

  return { concrete: false, text: value };
}

function parsePiTerm(value: string): AngleTerm | undefined {
  const match = PI_PATTERN.exec(value);

  if (!match?.groups) {
    return undefined;
  }

  const sign = match.groups.sign === '-' ? '-' : '';
  const coefficient = match.groups.coefficient ?? '1';
  const coefficientPrefix = coefficient === '1' ? '' : coefficient;
  const denominator = match.groups.denominator ?? '1';
  const denominatorSuffix = denominator === '1' ? '' : `/${denominator}`;

  return {
    concrete: true,
    text: `${sign}${coefficientPrefix}π${denominatorSuffix}`
  };
}

function parseProduct(value: string): AngleTerm | undefined {
  const match = MULTIPLIED_PATTERN.exec(value);

  if (!match?.groups) {
    return undefined;
  }

  const coefficient = match.groups.coefficient ?? '';
  const inner = new AngleExpression(match.groups.term).parse();

  return {
    concrete: inner.concrete,
    text: `${coefficient}*${inner.text}`
  };
}
