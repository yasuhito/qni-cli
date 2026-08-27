import type { CircuitData } from '../circuit_file';
import {
  parseCircuitOperation,
  parseCircuitOperationSlot,
  type ParsedCircuitOperation
} from '../circuit_operation';

const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;

const DOCUMENT_HEADER_LINES = [
  '\\documentclass[border=24px]{standalone}',
  '',
  '\\usepackage[braket, qm]{qcircuit}',
  '\\usepackage{graphicx}',
  '\\usepackage{textcomp}',
  '\\usepackage{xcolor}',
  '',
  '\\begin{document}'
];
const DOCUMENT_FOOTER_LINES = ['\\end{document}'];
const CIRCUIT_HEADER_LINES = ['\\scalebox{1.0}{'];
const CIRCUIT_FOOTER_LINES = ['\\\\ }', '}'];
const EMPTY_CIRCUIT_MIN_COLUMNS = 3;

const DIRECT_SLOT_RENDERERS = new Map<unknown, string>([
  [null, '\\qw'],
  ['', '\\qw'],
  [EMPTY_SLOT, '\\qw']
]);

const TARGET_SLOT_RENDERERS = new Map<unknown, string>([
  ['X', '\\targ']
]);

const SPECIAL_GATE_LABELS = new Map<unknown, string>([
  ['X^½', '\\sqrt{\\mathrm{X}}'],
  ['S†', '\\mathrm{S^\\dagger}'],
  ['T†', '\\mathrm{T^\\dagger}']
]);

const LATEX_ESCAPE_MAP = new Map<string, string>([
  ['\\', '\\textbackslash{}'],
  ['{', '\\{'],
  ['}', '\\}'],
  ['$', '\\$'],
  ['&', '\\&'],
  ['%', '\\%'],
  ['#', '\\#'],
  ['_', '\\_'],
  ['^', '\\textasciicircum{}'],
  ['~', '\\textasciitilde{}'],
  ['·', '$\\cdot$'],
  ['⊗', '$\\otimes$'],
  ['π', '$\\pi$']
]);

export interface QCircuitCaptionOptions {
  readonly caption?: string;
  readonly captionFormat?: 'tex' | 'text';
  readonly captionPosition?: string;
  readonly captionSize?: number;
}

export type ExportTheme = 'dark' | 'light';

export interface QCircuitLatexOptions extends QCircuitCaptionOptions {
  readonly theme: ExportTheme;
}

export function qcircuitRenderedColumnCount(circuit: Pick<CircuitData, 'cols'>): number {
  return circuit.cols.length > 0 ? circuit.cols.length : EMPTY_CIRCUIT_MIN_COLUMNS;
}

class QCircuitCaption {
  static readonly DEFAULT_POSITION = 'bottom';
  static readonly DEFAULT_SIZE_PT = 12;

  private readonly format: 'tex' | 'text';
  private readonly position: string;
  private readonly sizePt: number;
  private readonly text: string;

  constructor(options: QCircuitCaptionOptions) {
    this.format = options.captionFormat ?? 'text';
    this.position = options.captionPosition ?? QCircuitCaption.DEFAULT_POSITION;
    this.sizePt = options.captionSize ?? QCircuitCaption.DEFAULT_SIZE_PT;
    this.text = options.caption ?? '';
  }

  get lines(): string[] {
    if (!this.present) {
      return [];
    }

    return [`{\\fontsize{${this.sizePt}}{${this.lineHeightPt}}\\selectfont ${this.escapedText}}`];
  }

  get positionBottom(): boolean {
    return this.position === 'bottom';
  }

  get positionTop(): boolean {
    return this.position === 'top';
  }

  static validPosition(position: string): boolean {
    return position === 'top' || position === 'bottom';
  }

  private get escapedText(): string {
    if (this.format === 'tex') {
      return this.text;
    }

    return [...this.text].map((char) => LATEX_ESCAPE_MAP.get(char) ?? char).join('');
  }

  private get lineHeightPt(): number {
    return Math.ceil(this.sizePt * 1.25);
  }

  private get present(): boolean {
    return this.text.length > 0;
  }
}

export class QCircuitLatex {
  private readonly caption: QCircuitCaption;
  private readonly circuit: CircuitData;
  private readonly theme: ExportTheme;

  constructor(circuit: CircuitData, options: QCircuitLatexOptions) {
    this.caption = new QCircuitCaption(options);
    this.circuit = circuit;
    this.theme = options.theme;
  }

  render(): string {
    return this.documentLines.join('\n');
  }

  private get documentLines(): string[] {
    return [
      ...DOCUMENT_HEADER_LINES,
      this.themeColorLine,
      '\\begin{tabular}{c}',
      ...this.topCaptionLines,
      ...this.circuitLines,
      ...this.bottomCaptionLines,
      '\\end{tabular}',
      ...DOCUMENT_FOOTER_LINES
    ];
  }

  private get bottomCaptionLines(): string[] {
    if (!this.caption.positionBottom) {
      return [];
    }

    return ['\\\\[0.8em]', ...this.caption.lines];
  }

  private get circuitLines(): string[] {
    return [
      ...CIRCUIT_HEADER_LINES,
      '\\Qcircuit @C=0.55em @R=2.2em @!R { \\\\',
      this.renderedRows,
      ...CIRCUIT_FOOTER_LINES
    ];
  }

  private get renderedRows(): string {
    const renderedColumns = this.renderedColumns;

    return Array.from({ length: this.circuit.qubits }, (_unused, qubit) => {
      const renderedCells = renderedColumns.map((column) => column.renderFor(qubit));

      return `  ${this.wireLabel(qubit)} & ${[...renderedCells, '\\qw'].join(' & ')}\\\\`;
    }).join('\n');
  }

  private get renderedColumns(): QCircuitColumn[] {
    return this.columns.map((column) => new QCircuitColumn(column));
  }

  private get columns(): unknown[][] {
    if (this.circuit.cols.length > 0) {
      return this.circuit.cols;
    }

    return Array.from({ length: qcircuitRenderedColumnCount(this.circuit) }, () =>
      Array.from({ length: this.circuit.qubits }, () => EMPTY_SLOT)
    );
  }

  private get themeColorLine(): string {
    return `\\color{${this.themeColorName}}`;
  }

  private get themeColorName(): string {
    return this.theme === 'light' ? 'black' : 'white';
  }

  private get topCaptionLines(): string[] {
    if (!this.caption.positionTop) {
      return [];
    }

    return [...this.caption.lines, '\\\\[0.8em]'];
  }

  private wireLabel(qubit: number): string {
    return `\\push{q${qubit}: \\ket{0}}`;
  }
}

class QCircuitColumn {
  private readonly slots: unknown[];

  constructor(slots: unknown[]) {
    this.slots = slots;
  }

  renderFor(qubit: number): string {
    return this.renderedCells.get(qubit) ?? '\\qw';
  }

  private get renderedCells(): Map<number, string> {
    if (this.swapStep) {
      return this.swapCells();
    }

    if (this.controlledStep) {
      return this.controlledCells();
    }

    return this.simpleCells();
  }

  private get controlledStep(): boolean {
    return this.slots.includes(CONTROL_SYMBOL);
  }

  private get swapStep(): boolean {
    return this.slots.some((slot) => operationKind(slot) === 'swap');
  }

  private controlledCells(): Map<number, string> {
    const target = this.controlledTarget();
    const cells = new Map<number, string>();

    for (const controlQubit of this.controlQubits) {
      cells.set(controlQubit, `\\ctrl{${target.qubit - controlQubit}}`);
    }

    cells.set(target.qubit, target.renderedCell);
    this.addMeasurementCells(cells);
    return cells;
  }

  private controlledTarget(): ControlledTarget {
    const targets = this.slots
      .map((slot, qubit) => ({ qubit, slot }))
      .filter(
        ({ slot }) =>
          !emptySlot(slot) && slot !== CONTROL_SYMBOL && operationKind(slot) !== 'measurement'
      );

    if (targets.length !== 1) {
      throw new Error(`unsupported controlled step: ${rubyInspect(this.slots)}`);
    }

    return new ControlledTarget(targets[0].slot, targets[0].qubit);
  }

  private get controlQubits(): number[] {
    return this.slots
      .map((slot, index) => ({ index, slot }))
      .filter(({ slot }) => slot === CONTROL_SYMBOL)
      .map(({ index }) => index);
  }

  private simpleCells(): Map<number, string> {
    return new Map(this.slots.map((slot, qubit) => [qubit, renderedSlot(slot)]));
  }

  private swapCells(): Map<number, string> {
    if (!this.validSwapStep) {
      throw new Error(`unsupported swap step: ${rubyInspect(this.slots)}`);
    }

    const [topQubit, bottomQubit] = this.swapQubits.sort((a, b) => a - b);
    const condition = this.swapConditionLabel;
    const cells = new Map<number, string>([
      [topQubit, `\\qswap${condition}`],
      [bottomQubit, `\\qswap \\qwx[${topQubit - bottomQubit}]${condition}`]
    ]);

    for (const controlQubit of this.controlQubits) {
      cells.set(controlQubit, `\\ctrl{${this.controlledSwapTarget(controlQubit) - controlQubit}}`);
    }

    this.addMeasurementCells(cells);
    return cells;
  }

  private get validSwapStep(): boolean {
    return (
      this.swapQubits.length === 2 &&
      this.slots.every(
        (slot) =>
          emptySlot(slot) ||
          slot === CONTROL_SYMBOL ||
          operationKind(slot) === 'swap' ||
          operationKind(slot) === 'measurement'
      ) && this.consistentSwapConditions
    );
  }

  private get swapQubits(): number[] {
    return this.slots
      .map((slot, index) => ({ index, slot }))
      .filter(({ slot }) => operationKind(slot) === 'swap')
      .map(({ index }) => index);
  }

  private addMeasurementCells(cells: Map<number, string>): void {
    for (const qubit of this.measurementQubits) {
      cells.set(qubit, renderedSlot(this.slots[qubit]));
    }
  }

  private get measurementQubits(): number[] {
    return this.slots
      .map((slot, index) => ({ index, slot }))
      .filter(({ slot }) => operationKind(slot) === 'measurement')
      .map(({ index }) => index);
  }

  private get consistentSwapConditions(): boolean {
    return new Set(this.swapOperations.map((operation) => operation.classicalCondition)).size === 1;
  }

  private get swapConditionLabel(): string {
    const condition = this.swapOperations[0]?.classicalCondition;
    return condition === undefined ? '' : ` \\push{$<\\mathrm{${classicalNameLabel(condition)}}$}`;
  }

  private get swapOperations(): ParsedCircuitOperation[] {
    return this.slots.flatMap((slot) =>
      operationKind(slot) === 'swap' ? [parseCircuitOperation(slot)] : []
    );
  }

  private controlledSwapTarget(controlQubit: number): number {
    return this.swapQubits.reduce((nearest, swapQubit) =>
      Math.abs(swapQubit - controlQubit) < Math.abs(nearest - controlQubit) ? swapQubit : nearest
    );
  }
}

class ControlledTarget {
  readonly qubit: number;

  private readonly slot: unknown;

  constructor(slot: unknown, qubit: number) {
    this.slot = slot;
    this.qubit = qubit;
  }

  get renderedCell(): string {
    return TARGET_SLOT_RENDERERS.get(this.slot) ?? gateCell(this.slot);
  }
}

function emptySlot(slot: unknown): boolean {
  return slot === null || slot === '' || slot === EMPTY_SLOT;
}

function renderedSlot(slot: unknown): string {
  const direct = DIRECT_SLOT_RENDERERS.get(slot);
  if (direct !== undefined) {
    return direct;
  }

  const operation = parseCircuitOperation(slot);
  if (operation.kind === 'measurement') {
    const name = operation.measurementName;
    return name === undefined
      ? '\\meter'
      : `\\meter \\push{$>\\mathrm{${classicalNameLabel(name)}}$}`;
  }

  return gateCell(slot);
}

function gateCell(slot: unknown): string {
  return `\\gate{${gateLabel(slot)}}`;
}

function gateLabel(slot: unknown): string {
  const operation = parseCircuitOperation(slot);
  const specialLabel = SPECIAL_GATE_LABELS.get(operation.symbol);
  const match = /^(?<name>[A-Za-z]+)\((?<angle>.+)\)$/u.exec(operation.symbol);
  const baseLabel =
    specialLabel ??
    (match?.groups
      ? `\\mathrm{${match.groups.name}}(${formattedAngle(match.groups.angle)})`
      : `\\mathrm{${operation.symbol}}`);

  return operation.classicalCondition === undefined
    ? baseLabel
    : `${baseLabel}<\\mathrm{${classicalNameLabel(operation.classicalCondition)}}`;
}

function classicalNameLabel(name: string): string {
  return name.replaceAll('_', '\\_');
}

function operationKind(slot: unknown): 'gate' | 'measurement' | 'swap' | undefined {
  return emptySlot(slot) ? undefined : parseCircuitOperationSlot(slot)?.kind;
}

function formattedAngle(angle: string): string {
  return angle.replace(/π|(?<![A-Za-z])pi(?![A-Za-z])/gu, '\\pi');
}

function rubyInspect(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => rubyInspect(item)).join(', ')}]`;
  }

  if (value === null || value === undefined) {
    return 'nil';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function validateCaptionOptions(options: QCircuitCaptionOptions): void {
  const position = options.captionPosition ?? QCircuitCaption.DEFAULT_POSITION;
  const size = options.captionSize ?? QCircuitCaption.DEFAULT_SIZE_PT;

  if (!QCircuitCaption.validPosition(position)) {
    throw new Error('--caption-position must be top or bottom');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('--caption-size must be positive');
  }
}
