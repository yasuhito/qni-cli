import type { CircuitData } from '../circuit_file';

const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const SWAP_SYMBOL = 'Swap';

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

    return Array.from({ length: EMPTY_CIRCUIT_MIN_COLUMNS }, () =>
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
    return this.slots.includes(SWAP_SYMBOL);
  }

  private controlledCells(): Map<number, string> {
    const target = this.controlledTarget();
    const cells = new Map<number, string>();

    for (const controlQubit of this.controlQubits) {
      cells.set(controlQubit, `\\ctrl{${target.qubit - controlQubit}}`);
    }

    cells.set(target.qubit, target.renderedCell);
    return cells;
  }

  private controlledTarget(): ControlledTarget {
    const targets = this.slots
      .map((slot, qubit) => ({ qubit, slot }))
      .filter(({ slot }) => !emptySlot(slot) && slot !== CONTROL_SYMBOL);

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

    return new Map<number, string>([
      [topQubit, '\\qswap'],
      [bottomQubit, `\\qswap \\qwx[${topQubit - bottomQubit}]`]
    ]);
  }

  private get validSwapStep(): boolean {
    return this.swapQubits.length === 2 && this.slots.every((slot) => emptySlot(slot) || slot === SWAP_SYMBOL);
  }

  private get swapQubits(): number[] {
    return this.slots
      .map((slot, index) => ({ index, slot }))
      .filter(({ slot }) => slot === SWAP_SYMBOL)
      .map(({ index }) => index);
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
  return DIRECT_SLOT_RENDERERS.has(slot);
}

function renderedSlot(slot: unknown): string {
  return DIRECT_SLOT_RENDERERS.get(slot) ?? gateCell(slot);
}

function gateCell(slot: unknown): string {
  return `\\gate{${gateLabel(slot)}}`;
}

function gateLabel(slot: unknown): string {
  const specialLabel = SPECIAL_GATE_LABELS.get(slot);

  if (specialLabel) {
    return specialLabel;
  }

  const label = String(slot);
  const match = /^(?<name>[A-Za-z]+)\((?<angle>.+)\)$/u.exec(label);

  if (match?.groups) {
    return `\\mathrm{${match.groups.name}}(${formattedAngle(match.groups.angle)})`;
  }

  return `\\mathrm{${label}}`;
}

function formattedAngle(angle: string): string {
  return angle.replace(/π/gu, '\\pi').replace(/(?<![A-Za-z])pi(?![A-Za-z])/gu, '\\pi');
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
