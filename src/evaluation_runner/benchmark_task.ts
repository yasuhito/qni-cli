import { readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';

import { splitCommandLine } from '../qni_command_line';

export interface BenchmarkTask {
  readonly allowedCommands: readonly AllowedCommand[];
  readonly checks: BenchmarkChecks;
  readonly gradingCases: readonly BenchmarkGradingCase[];
  readonly hasExplicitGradingCases?: boolean;
  readonly id: string;
  readonly title: string;
}

interface ParsedQniCommand {
  readonly argv: readonly string[];
  readonly source: string;
}

export interface AllowedCommand {
  readonly argv: readonly string[];
  readonly source: string;
}

export interface BenchmarkSetupCommand {
  readonly argv: readonly string[];
  readonly source: string;
}

export interface BenchmarkGradingCase {
  readonly checks: BenchmarkChecks;
  readonly id: string;
  readonly setupCommands: readonly BenchmarkSetupCommand[];
}

export interface BenchmarkChecks {
  readonly items: readonly BenchmarkCheck[];
  readonly tolerance: number;
}

export type BenchmarkCheck = ExpectCheck | RunCheck;

export interface RunCheck {
  readonly expected: readonly ExpectedAmplitude[];
  readonly type: 'run';
}

export interface ExpectCheck {
  readonly expected: readonly ExpectedExpectation[];
  readonly type: 'expect';
}

export interface ExpectedAmplitude {
  readonly amplitude: ComplexAmplitude;
  readonly basis: string;
}

export interface ExpectedExpectation {
  readonly pauli: string;
  readonly value: number;
}

export interface ComplexAmplitude {
  readonly imaginary: number;
  readonly real: number;
}

type FrontmatterRecord = Readonly<Record<string, unknown>>;

class BenchmarkTaskError extends Error {}

const IMPLICIT_GRADING_CASE_ID = 'default';

export function loadBenchmarkTask(taskPath: string): BenchmarkTask {
  const frontmatter = frontmatterRecord(frontmatterOf(readFileSync(taskPath, 'utf8')));
  const allowedCommands = parseAllowedCommands(frontmatter);
  const hasExplicitGradingCases = hasValue(frontmatter, 'grading_cases');
  const gradingCases = parseGradingCases(frontmatter, hasExplicitGradingCases);

  return {
    allowedCommands,
    checks: compatibleChecks(gradingCases),
    gradingCases,
    hasExplicitGradingCases,
    id: scalarValue(frontmatter, 'id'),
    title: scalarValue(frontmatter, 'title')
  };
}

function compatibleChecks(gradingCases: readonly BenchmarkGradingCase[]): BenchmarkChecks {
  return (gradingCases.find((gradingCase) => gradingCase.id === IMPLICIT_GRADING_CASE_ID) ?? gradingCases[0]).checks;
}

function frontmatterOf(markdown: string): string {
  const match = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(markdown);

  if (!match?.groups) {
    throw new BenchmarkTaskError('benchmark task file must start with YAML frontmatter');
  }

  return match.groups.frontmatter;
}

function frontmatterRecord(frontmatter: string): FrontmatterRecord {
  const document = parseDocument(frontmatter);
  const firstError = document.errors[0];

  if (firstError) {
    throw new BenchmarkTaskError(`invalid YAML frontmatter: ${firstYamlErrorLine(firstError)}`);
  }

  const value = document.toJS() as unknown;

  if (!isRecord(value)) {
    throw new BenchmarkTaskError('YAML frontmatter must be a mapping');
  }

  return value;
}

function firstYamlErrorLine(error: Error): string {
  return error.message.split(/\r?\n/u)[0] ?? error.message;
}

function parseAllowedCommands(frontmatter: FrontmatterRecord): AllowedCommand[] {
  return frontmatterListValues(frontmatter, 'allowed_commands')
    .map((source) => parseQniCommand(source, 'allowed_commands entries must start with a qni subcommand'));
}

function frontmatterListValues(frontmatter: FrontmatterRecord, key: string): string[] {
  const value = requiredValue(frontmatter, key);

  if (!Array.isArray(value)) {
    throw new BenchmarkTaskError(`${key} must list at least one item`);
  }

  if (value.length === 0) {
    throw new BenchmarkTaskError(`${key} must list at least one item`);
  }

  return value.map((item) => stringListValue(item, key));
}

function parseChecks(frontmatter: FrontmatterRecord): BenchmarkChecks {
  const checks = recordValue(frontmatter, 'checks');

  return {
    items: parseCheckItems(checks),
    tolerance: checksTolerance(checks)
  };
}

function parseGradingCases(
  frontmatter: FrontmatterRecord,
  hasExplicitGradingCases: boolean
): BenchmarkGradingCase[] {
  const hasRootChecks = hasValue(frontmatter, 'checks');

  if (hasRootChecks && hasExplicitGradingCases) {
    throw new BenchmarkTaskError('checks and grading_cases must not both be specified');
  }

  if (hasExplicitGradingCases) {
    return parseExplicitGradingCases(frontmatter);
  }

  return [
    {
      checks: parseChecks(frontmatter),
      id: IMPLICIT_GRADING_CASE_ID,
      setupCommands: []
    }
  ];
}

function parseExplicitGradingCases(frontmatter: FrontmatterRecord): BenchmarkGradingCase[] {
  const cases = requiredValue(frontmatter, 'grading_cases');

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new BenchmarkTaskError('grading_cases must list at least one case');
  }

  const seenIds = new Set<string>();

  return cases.map((item) => {
    const gradingCase = requiredRecord(item, 'grading_cases entries must be mappings');
    const id = nonEmptyScalarValue(gradingCase, 'id', 'grading_cases id must not be empty');

    if (seenIds.has(id)) {
      throw new BenchmarkTaskError(`duplicate grading_cases id: ${id}`);
    }

    seenIds.add(id);

    return {
      checks: parseChecks(gradingCase),
      id,
      setupCommands: parseSetupCommands(gradingCase)
    };
  });
}

function parseSetupCommands(gradingCase: FrontmatterRecord): BenchmarkSetupCommand[] {
  const setupCommands = gradingCase.setup_commands;

  if (setupCommands === undefined) {
    return [];
  }

  if (!Array.isArray(setupCommands)) {
    throw new BenchmarkTaskError('setup_commands must be a list of qni subcommands');
  }

  return setupCommands
    .map((item) => stringListValue(item, 'setup_commands'))
    .map((source) => parseQniCommand(source, 'setup_commands entries must start with a qni subcommand'));
}

function checksTolerance(checks: FrontmatterRecord): number {
  return parseNumber(requiredValue(checks, 'tolerance', 'checks.tolerance is required'));
}

function parseCheckItems(checks: FrontmatterRecord): BenchmarkCheck[] {
  const items = requiredValue(checks, 'items', 'checks.items is required');

  if (!Array.isArray(items) || items.length === 0) {
    throw new BenchmarkTaskError('checks.items must list at least one item');
  }

  return items.map(parseCheckItem);
}

function parseCheckItem(item: unknown): BenchmarkCheck {
  const check = requiredRecord(item, 'checks.items entries must be mappings');
  const type = scalarValue(check, 'type');

  switch (type) {
    case 'expect':
      return { expected: parseExpectedExpectations(check), type: 'expect' };
    case 'run':
      return { expected: parseExpectedAmplitudes(check), type: 'run' };
    default:
      throw new BenchmarkTaskError(`unsupported check type: ${type}`);
  }
}

function parseExpectedAmplitudes(check: FrontmatterRecord): ExpectedAmplitude[] {
  const expected = expectedList(check, 'run check expected amplitudes are required');

  return expected.map((item) => {
    const entry = requiredRecord(item, 'run check expected amplitudes must be mappings');
    const amplitude = recordValue(entry, 'amplitude');

    return {
      amplitude: {
        imaginary: parseNumber(requiredValue(amplitude, 'imaginary')),
        real: parseNumber(requiredValue(amplitude, 'real'))
      },
      basis: scalarValue(entry, 'basis')
    };
  });
}

function parseExpectedExpectations(check: FrontmatterRecord): ExpectedExpectation[] {
  const expected = expectedList(check, 'expect check expected values are required');

  return expected.map((item) => {
    const entry = requiredRecord(item, 'expect check expected values must be mappings');
    const pauli = scalarValue(entry, 'pauli').toUpperCase();

    if (pauli.length === 0) {
      throw new BenchmarkTaskError('expect check pauli must not be empty');
    }

    return {
      pauli,
      value: parseNumber(requiredValue(entry, 'value'))
    };
  });
}

function expectedList(check: FrontmatterRecord, errorMessage: string): readonly unknown[] {
  const expected = check.expected;

  if (!Array.isArray(expected) || expected.length === 0) {
    throw new BenchmarkTaskError(errorMessage);
  }

  return expected;
}

function recordValue(record: FrontmatterRecord, key: string): FrontmatterRecord {
  return requiredRecord(requiredValue(record, key), `${key} must be a mapping`);
}

function requiredRecord(value: unknown, errorMessage: string): FrontmatterRecord {
  if (!isRecord(value)) {
    throw new BenchmarkTaskError(errorMessage);
  }

  return value;
}

function requiredValue(record: FrontmatterRecord, key: string, errorMessage = `${key} is required`): unknown {
  const value = record[key];

  if (value === undefined) {
    throw new BenchmarkTaskError(errorMessage);
  }

  return value;
}

function hasValue(record: FrontmatterRecord, key: string): boolean {
  return record[key] !== undefined;
}

function scalarValue(record: FrontmatterRecord, key: string): string {
  const value = requiredValue(record, key);

  if (typeof value !== 'string') {
    throw new BenchmarkTaskError(`${key} must be a string`);
  }

  return value;
}

function nonEmptyScalarValue(record: FrontmatterRecord, key: string, errorMessage: string): string {
  const value = scalarValue(record, key).trim();

  if (value.length === 0) {
    throw new BenchmarkTaskError(errorMessage);
  }

  return value;
}

function stringListValue(value: unknown, key: string): string {
  if (typeof value !== 'string') {
    throw new BenchmarkTaskError(`${key} entries must be strings`);
  }

  return value;
}

function parseQniCommand(source: string, errorPrefix: string): ParsedQniCommand {
  const argv = splitCommandLine(source);

  if (argv[0] !== 'qni' || argv.length < 2) {
    throw new BenchmarkTaskError(`${errorPrefix}: ${source}`);
  }

  return {
    argv: argv.slice(1),
    source: argv.join(' ')
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNumber(value: unknown): number {
  const result = typeof value === 'number' ? value : Number(String(value));

  if (Number.isNaN(result)) {
    throw new BenchmarkTaskError(`invalid number: ${String(value)}`);
  }

  return result;
}
