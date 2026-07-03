import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path = require('node:path');

import { AngleExpression, AngleExpressionError } from '../angle_expression';
import { loadBenchmarkTask } from './benchmark_task';

export class NeutralCircuitJsonSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeutralCircuitJsonSubmissionError';
  }
}

export interface NeutralCircuitJsonToQniSubmissionOptions {
  readonly availableGates: readonly string[];
  readonly submissionText: string;
}

export interface NeutralCircuitJsonDirectoryConversionResult {
  readonly relativeSubmissionFiles: readonly string[];
}

export interface NeutralCircuitJsonDirectoryConversionOptions {
  readonly benchmarkDirPath: string;
  readonly circuitJsonDirPath: string;
  readonly outputDirPath: string;
}

interface NeutralCircuitJsonSubmission {
  readonly operations: readonly unknown[];
}

interface GateDefinition {
  readonly canonicalGate: string;
  readonly controlCount: number;
  readonly qniGate: string;
  readonly requiresAngle: boolean;
  readonly targetCount: number;
}

type JsonRecord = Readonly<Record<string, unknown>>;

const ALLOWED_OPERATION_KEYS = new Set(['angle', 'controls', 'gate', 'targets']);
const NUMERIC_ANGLE_PATTERN = /^[+-]?\d+(?:\.\d+)?$/u;

const PHASE_GATE: GateDefinition = {
  canonicalGate: 'Phase',
  controlCount: 0,
  qniGate: 'P',
  requiresAngle: true,
  targetCount: 1
};
const TOFFOLI_GATE: GateDefinition = {
  canonicalGate: 'Toffoli',
  controlCount: 2,
  qniGate: 'X',
  requiresAngle: false,
  targetCount: 1
};

const GATE_DEFINITIONS = new Map<string, GateDefinition>([
  ...fixedSingleQubitGateDefinitions(['X', 'Y', 'Z', 'H', 'S', 'T']),
  ['Phase', PHASE_GATE],
  ['P', PHASE_GATE],
  ['GlobalPhase', {
    canonicalGate: 'GlobalPhase',
    controlCount: 0,
    qniGate: 'GlobalPhase',
    requiresAngle: true,
    targetCount: 1
  }],
  ['CNOT', {
    canonicalGate: 'CNOT',
    controlCount: 1,
    qniGate: 'X',
    requiresAngle: false,
    targetCount: 1
  }],
  ['CZ', {
    canonicalGate: 'CZ',
    controlCount: 1,
    qniGate: 'Z',
    requiresAngle: false,
    targetCount: 1
  }],
  ['ControlledPhase', {
    canonicalGate: 'ControlledPhase',
    controlCount: 1,
    qniGate: 'P',
    requiresAngle: true,
    targetCount: 1
  }],
  ['ControlledGlobalPhase', {
    canonicalGate: 'ControlledGlobalPhase',
    controlCount: 1,
    qniGate: 'GlobalPhase',
    requiresAngle: true,
    targetCount: 1
  }],
  ['Toffoli', TOFFOLI_GATE],
  ['CCNOT', TOFFOLI_GATE],
  ['SWAP', {
    canonicalGate: 'SWAP',
    controlCount: 0,
    qniGate: 'SWAP',
    requiresAngle: false,
    targetCount: 2
  }],
  ['CSWAP', {
    canonicalGate: 'CSWAP',
    controlCount: 1,
    qniGate: 'SWAP',
    requiresAngle: false,
    targetCount: 2
  }]
]);

export function convertNeutralCircuitJsonToQniSubmission(
  options: NeutralCircuitJsonToQniSubmissionOptions
): string {
  const submission = parseNeutralCircuitJsonSubmission(options.submissionText);
  const availableGateNames = canonicalAvailableGateNames(options.availableGates);
  const commands = submission.operations.map((operation, index) => qniCommandForOperation({
    availableGateNames,
    index,
    operation
  }));

  return commands.length === 0 ? '' : `${commands.join('\n')}\n`;
}

export function writeNeutralCircuitJsonDirectoryAsQniSubmissions(
  options: NeutralCircuitJsonDirectoryConversionOptions
): NeutralCircuitJsonDirectoryConversionResult {
  const relativeTaskFiles = markdownFilesInDirectory(options.benchmarkDirPath);
  const relativeSubmissionFiles: string[] = [];

  for (const relativeTaskFile of relativeTaskFiles) {
    const relativeJsonFile = relativeTaskFile.replace(/\.md$/u, '.json');
    const relativeSubmissionFile = relativeTaskFile.replace(/\.md$/u, '.qni');
    const availableGates = availableGatesForBenchmarkTask(path.join(options.benchmarkDirPath, relativeTaskFile));
    const qniSubmission = availableGates
      ? qniSubmissionForNeutralCircuitJsonFile({
        availableGates,
        circuitJsonPath: path.join(options.circuitJsonDirPath, relativeJsonFile),
        relativeJsonFile
      })
      : '';
    const outputPath = path.join(options.outputDirPath, relativeSubmissionFile);

    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, qniSubmission);
    relativeSubmissionFiles.push(toPosixPath(relativeSubmissionFile));
  }

  return { relativeSubmissionFiles };
}

function availableGatesForBenchmarkTask(taskPath: string): readonly string[] | undefined {
  try {
    return loadBenchmarkTask(taskPath).availableGates;
  } catch {
    return undefined;
  }
}

function qniSubmissionForNeutralCircuitJsonFile(options: {
  readonly availableGates: readonly string[];
  readonly circuitJsonPath: string;
  readonly relativeJsonFile: string;
}): string {
  try {
    return convertNeutralCircuitJsonToQniSubmission({
      availableGates: options.availableGates,
      submissionText: readNeutralCircuitJsonFile(options.circuitJsonPath, options.relativeJsonFile)
    });
  } catch (error) {
    if (error instanceof NeutralCircuitJsonSubmissionError) {
      return disallowedNeutralCircuitJsonSubmission(error);
    }

    throw error;
  }
}

function readNeutralCircuitJsonFile(circuitJsonPath: string, relativeJsonFile: string): string {
  if (!existsSync(circuitJsonPath)) {
    throw new NeutralCircuitJsonSubmissionError(`neutral circuit JSON file does not exist: ${toPosixPath(relativeJsonFile)}`);
  }

  if (!statSync(circuitJsonPath).isFile()) {
    throw new NeutralCircuitJsonSubmissionError(`neutral circuit JSON path is not a file: ${toPosixPath(relativeJsonFile)}`);
  }

  return readFileSync(circuitJsonPath, 'utf8');
}

function disallowedNeutralCircuitJsonSubmission(error: NeutralCircuitJsonSubmissionError): string {
  const encodedMessage = Buffer.from(error.message, 'utf8').toString('base64url');

  return `qni neutral-circuit-json-invalid --message ${encodedMessage}\n`;
}

function markdownFilesInDirectory(dir: string): string[] {
  return markdownFilesInDirectoryEntries(dir, '').sort();
}

function markdownFilesInDirectoryEntries(root: string, relativeDir: string): string[] {
  const dir = path.join(root, relativeDir);
  const entries = readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...markdownFilesInDirectoryEntries(root, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

function fixedSingleQubitGateDefinitions(gates: readonly string[]): Array<readonly [string, GateDefinition]> {
  return gates.map((gate) => [gate, {
    canonicalGate: gate,
    controlCount: 0,
    qniGate: gate,
    requiresAngle: false,
    targetCount: 1
  }] as const);
}

function parseNeutralCircuitJsonSubmission(submissionText: string): NeutralCircuitJsonSubmission {
  const trimmedText = submissionText.trim();

  if (trimmedText.length === 0) {
    throw new NeutralCircuitJsonSubmissionError('neutral circuit submission must not be empty');
  }

  if (trimmedText.startsWith('```')) {
    throw new NeutralCircuitJsonSubmissionError('neutral circuit submission must not be wrapped in Markdown code fences');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(submissionText) as unknown;
  } catch {
    throw new NeutralCircuitJsonSubmissionError('neutral circuit submission must be valid JSON with no explanatory text');
  }

  const record = jsonRecord(parsed, 'neutral circuit submission must be a top-level object');
  const unknownTopLevelKey = Object.keys(record).find((key) => key !== 'operations');

  if (unknownTopLevelKey) {
    throw new NeutralCircuitJsonSubmissionError(`unknown top-level key: ${unknownTopLevelKey}`);
  }

  if (!Object.hasOwn(record, 'operations')) {
    throw new NeutralCircuitJsonSubmissionError('top-level operations is required');
  }

  if (!Array.isArray(record.operations)) {
    throw new NeutralCircuitJsonSubmissionError('top-level operations must be an array');
  }

  return { operations: record.operations };
}

function qniCommandForOperation(options: {
  readonly availableGateNames: ReadonlySet<string>;
  readonly index: number;
  readonly operation: unknown;
}): string {
  const operation = operationRecord(options.operation, options.index);
  const gate = gateName(operation, options.index);
  const definition = GATE_DEFINITIONS.get(gate);

  if (!definition) {
    throw new NeutralCircuitJsonSubmissionError(`unknown gate at operations[${options.index}]: ${gate}`);
  }

  if (!options.availableGateNames.has(definition.canonicalGate)) {
    throw new NeutralCircuitJsonSubmissionError(`gate at operations[${options.index}] is not available for this task: ${gate}`);
  }

  const controls = qubitArguments(operation, 'controls', options.index);
  const targets = qubitArguments(operation, 'targets', options.index);
  const angle = operationAngle(operation, definition, gate, options.index);

  assertArgumentCount({ controls, definition, gate, index: options.index, targets });

  return qniCommand({ angle, controls, definition, step: options.index, targets });
}

function operationRecord(operation: unknown, index: number): JsonRecord {
  const record = jsonRecord(operation, `operations[${index}] must be an object`);
  const unknownOperationKey = Object.keys(record).find((key) => !ALLOWED_OPERATION_KEYS.has(key));

  if (unknownOperationKey) {
    throw new NeutralCircuitJsonSubmissionError(`unknown operation key at operations[${index}]: ${unknownOperationKey}`);
  }

  return record;
}

function gateName(operation: JsonRecord, index: number): string {
  const gate = operation.gate;

  if (typeof gate !== 'string') {
    throw new NeutralCircuitJsonSubmissionError(`gate at operations[${index}] must be a string`);
  }

  return gate;
}

function operationAngle(
  operation: JsonRecord,
  definition: GateDefinition,
  gate: string,
  index: number
): string | undefined {
  if (!definition.requiresAngle) {
    if (Object.hasOwn(operation, 'angle')) {
      throw new NeutralCircuitJsonSubmissionError(`${gate} at operations[${index}] does not accept angle`);
    }

    return undefined;
  }

  if (!Object.hasOwn(operation, 'angle')) {
    throw new NeutralCircuitJsonSubmissionError(`${gate} at operations[${index}] expects an angle, ${argumentExpectation(definition)}`);
  }

  return normalizedAngle(operation.angle, index);
}

function normalizedAngle(angle: unknown, index: number): string {
  if (typeof angle !== 'string') {
    throw new NeutralCircuitJsonSubmissionError(`angle at operations[${index}] must be a string`);
  }

  const compactAngle = angle.replace(/\s/gu, '');

  if (NUMERIC_ANGLE_PATTERN.test(compactAngle)) {
    throw new NeutralCircuitJsonSubmissionError(`angle at operations[${index}] must use a symbolic pi expression, not numeric radians`);
  }

  try {
    const expression = new AngleExpression(angle);

    if (!expression.concrete()) {
      throw new NeutralCircuitJsonSubmissionError(`angle at operations[${index}] must use a symbolic pi expression`);
    }

    return expression.toString();
  } catch (error) {
    if (error instanceof AngleExpressionError) {
      throw new NeutralCircuitJsonSubmissionError(`invalid angle at operations[${index}]: ${error.message}`);
    }

    throw error;
  }
}

function assertArgumentCount(options: {
  readonly controls: readonly number[];
  readonly definition: GateDefinition;
  readonly gate: string;
  readonly index: number;
  readonly targets: readonly number[];
}): void {
  if (
    options.controls.length === options.definition.controlCount &&
    options.targets.length === options.definition.targetCount
  ) {
    return;
  }

  throw new NeutralCircuitJsonSubmissionError(
    `${options.gate} at operations[${options.index}] expects ${argumentExpectation(options.definition)}`
  );
}

function argumentExpectation(definition: GateDefinition): string {
  return `${countExpectation(definition.controlCount, 'control')} and ${countExpectation(definition.targetCount, 'target')}`;
}

function countExpectation(count: number, singularName: string): string {
  if (count === 0) {
    return `no ${singularName}s`;
  }

  if (count === 1) {
    return `1 ${singularName}`;
  }

  return `${count} ${singularName}s`;
}

function qubitArguments(operation: JsonRecord, key: 'controls' | 'targets', index: number): number[] {
  const value = operation[key];

  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new NeutralCircuitJsonSubmissionError(`${key} at operations[${index}] must be an array`);
  }

  return value.map((item, itemIndex) => qubitIndex(item, `${key}[${itemIndex}] at operations[${index}]`));
}

function qubitIndex(value: unknown, description: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new NeutralCircuitJsonSubmissionError(`${description} must be a non-negative integer`);
  }

  return value;
}

function qniCommand(options: {
  readonly angle: string | undefined;
  readonly controls: readonly number[];
  readonly definition: GateDefinition;
  readonly step: number;
  readonly targets: readonly number[];
}): string {
  const words = ['qni', 'add', options.definition.qniGate];

  if (options.angle !== undefined) {
    words.push('--angle', options.angle);
  }

  if (options.controls.length > 0) {
    words.push('--control', options.controls.join(','));
  }

  words.push('--qubit', options.targets.join(','));
  words.push('--step', String(options.step));

  return words.join(' ');
}

function canonicalAvailableGateNames(availableGates: readonly string[]): ReadonlySet<string> {
  return new Set(availableGates.map(canonicalAvailableGateName));
}

function canonicalAvailableGateName(signature: string): string {
  if (typeof signature !== 'string') {
    throw new NeutralCircuitJsonSubmissionError('available_gates entries must be strings');
  }

  const match = /^\s*(?<gate>[A-Za-z][A-Za-z0-9]*)\s*(?:\(|$)/u.exec(signature);

  if (!match?.groups) {
    throw new NeutralCircuitJsonSubmissionError(`invalid available gate signature: ${signature}`);
  }

  const gate = match.groups.gate;
  return GATE_DEFINITIONS.get(gate)?.canonicalGate ?? gate;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function jsonRecord(value: unknown, message: string): JsonRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  throw new NeutralCircuitJsonSubmissionError(message);
}
