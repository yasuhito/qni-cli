import type { CircuitData } from '../circuit_file';
import { AngleExpression } from '../angle_expression';

const CELL_WIDTH = 5;
const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const SQRT_X_SYMBOL = 'X^½';
const SQRT_X_VIEW_SYMBOL = '√X';
const SWAP_SYMBOL = 'Swap';

export class AsciiCircuitParserError extends Error {}

interface StepSlice {
  readonly annotation: string;
  readonly bottom: string;
  readonly mid: string;
  readonly top: string;
}

const FIXED_GATE_LABELS = new Map<string, string>([
  ['H', 'H'],
  ['S', 'S'],
  ['S†', 'S†'],
  ['T', 'T'],
  ['T†', 'T†'],
  ['X', 'X'],
  ['Y', 'Y'],
  ['Z', 'Z'],
  [SQRT_X_VIEW_SYMBOL, SQRT_X_SYMBOL]
]);
const ANGLED_GATE_LABELS = new Set(['P', 'Rx', 'Ry', 'Rz']);
const ANGLED_GATE_ERROR = 'ASCII parser angled gates require a dedicated angle line above the box';
const BOX_BORDER_PATTERN = /[┌┐└┘├┤]/u;
const MID_LINE_PATTERN = /^(?<prefix>\s*q(?<qubit>\d+): )(?<wire>.*)$/u;
const UNEXPECTED_ANGLE_ERROR = 'ASCII parser angle lines are only supported for Rx, Ry, Rz, and P boxes';

export class AsciiCircuitParser {
  private readonly asciiArt: string;

  constructor(asciiArt: string) {
    this.asciiArt = asciiArt;
  }

  parse(): CircuitData {
    return new AsciiWireLayout(this.asciiArt).toCircuitData();
  }
}

export function parseAsciiCircuit(asciiArt: string): CircuitData {
  return new AsciiCircuitParser(asciiArt).parse();
}

class LineSet {
  private readonly asciiArt: string;
  private linesCache: string[] | undefined;
  private parsedMidLinesCache: Array<readonly [number, RegExpExecArray]> | undefined;
  private wireLabelWidthCache: number | undefined;
  private wirePrefixCache: string | undefined;
  private wireWidthCache: number | undefined;

  constructor(asciiArt: string) {
    this.asciiArt = asciiArt;
  }

  adjacentWireSegment(lineIndex: number): string | undefined {
    if (lineIndex < 0 || lineIndex >= this.lines().length) {
      return undefined;
    }

    const line = this.lines()[lineIndex];

    if (MID_LINE_PATTERN.test(line)) {
      return undefined;
    }

    return this.wireSegmentFor(line);
  }

  annotationWireSegment(lineIndex: number): string | undefined {
    if (!this.adjacentWireSegment(lineIndex - 1)?.match(BOX_BORDER_PATTERN)) {
      return undefined;
    }

    return this.annotationCandidateSegment(lineIndex - 2);
  }

  parsedMidLines(): Array<readonly [number, RegExpExecArray]> {
    if (this.parsedMidLinesCache) {
      return this.parsedMidLinesCache;
    }

    const midLines = this.collectMidLines();

    this.validateMidLinesPresent(midLines);
    this.validateQubitOrder(midLines);
    this.parsedMidLinesCache = midLines;

    return midLines;
  }

  wireWidth(): number {
    this.wireWidthCache ??= Math.max(
      ...this.parsedMidLines().map(([_lineIndex, match]) => charLength(match.groups?.wire ?? '')),
      0
    );

    return this.wireWidthCache;
  }

  private annotationCandidateSegment(candidateIndex: number): string | undefined {
    if (candidateIndex < 0 || candidateIndex >= this.lines().length) {
      return undefined;
    }

    const segment = this.annotationSegment(candidateIndex);

    if (segment && segment.trim() !== '' && !BOX_BORDER_PATTERN.test(segment)) {
      return segment;
    }

    return undefined;
  }

  private annotationSegment(candidateIndex: number): string | undefined {
    const line = this.lines()[candidateIndex];

    if (MID_LINE_PATTERN.test(line)) {
      return undefined;
    }

    return this.wireSegmentFor(line);
  }

  private collectMidLines(): Array<readonly [number, RegExpExecArray]> {
    return this.lines().flatMap((line, index) => {
      const match = MID_LINE_PATTERN.exec(line);

      return match ? [[index, match] as const] : [];
    });
  }

  private lines(): string[] {
    this.linesCache ??= this.asciiArt
      .split('\n')
      .map((line) => rstrip(line))
      .filter((line) => line !== '');

    return this.linesCache;
  }

  private validateMidLinesPresent(midLines: Array<readonly [number, RegExpExecArray]>): void {
    if (midLines.length === 0) {
      throw new AsciiCircuitParserError('ASCII parser requires at least one qubit line');
    }
  }

  private validateQubitOrder(midLines: Array<readonly [number, RegExpExecArray]>): void {
    const qubits = midLines.map(([_lineIndex, match]) => Number(match.groups?.qubit ?? -1));

    if (qubits.every((qubit, index) => qubit === index)) {
      return;
    }

    throw new AsciiCircuitParserError('ASCII parser requires q0..qn qubit order');
  }

  private wireLabelWidth(): number {
    this.wireLabelWidthCache ??= Math.max(
      ...this.parsedMidLines().map(([_lineIndex, match]) => charLength(match.groups?.prefix ?? ''))
    );

    return this.wireLabelWidthCache;
  }

  private wirePrefix(): string {
    this.wirePrefixCache ??= ' '.repeat(this.wireLabelWidth());

    return this.wirePrefixCache;
  }

  private wireSegmentFor(line: string): string {
    if (!line.startsWith(this.wirePrefix())) {
      throw new AsciiCircuitParserError(
        `ASCII parser wire label width/padding mismatch: expected prefix ${JSON.stringify(
          this.wirePrefix()
        )}, got ${JSON.stringify(line.slice(0, this.wirePrefix().length))}`
      );
    }

    return line.slice(this.wirePrefix().length);
  }
}

class BoxWidthDetector {
  private readonly wire: string;

  constructor(wire: string) {
    this.wire = wire;
  }

  widthFrom(position: number): number | undefined {
    const wireChars = chars(this.wire);
    const startChar = wireChars[position];
    const closingChar = startChar === '┌' ? '┐' : startChar === '└' ? '┘' : undefined;

    if (!closingChar) {
      return undefined;
    }

    const closingIndex = wireChars.findIndex((char, index) => index >= position && char === closingChar);

    if (closingIndex === -1) {
      return undefined;
    }

    return closingIndex - position + 1;
  }
}

class WireRow {
  private readonly annotation: string;
  private readonly bottom: string;
  private readonly mid: string;
  private readonly top: string;

  constructor(options: { annotation: string; bottom: string; mid: string; top: string }) {
    this.annotation = options.annotation;
    this.top = options.top;
    this.mid = options.mid;
    this.bottom = options.bottom;
  }

  boxWidthsAt(position: number): number[] {
    return [this.top, this.bottom].flatMap((wire) => {
      const width = new BoxWidthDetector(wire).widthFrom(position);

      return width === undefined ? [] : [width];
    });
  }

  stepSlice(position: number, stepWidth: number): StepSlice {
    return {
      annotation: sliceChars(this.annotation, position, stepWidth),
      bottom: sliceChars(this.bottom, position, stepWidth),
      mid: sliceChars(this.mid, position, stepWidth),
      top: sliceChars(this.top, position, stepWidth)
    };
  }
}

class AsciiWireLayout {
  private readonly asciiArt: string;
  private lineSetCache?: LineSet;

  constructor(asciiArt: string) {
    this.asciiArt = asciiArt;
  }

  toCircuitData(): CircuitData {
    return {
      cols: this.eachStep().map((stepSlices) => new AsciiStepParser(stepSlices).toSlots()),
      qubits: this.qubitCount()
    };
  }

  private buildWireRow(lineIndex: number, match: RegExpExecArray): WireRow {
    return new WireRow({
      annotation: this.paddedWireSegment(this.lineSet().annotationWireSegment(lineIndex)),
      bottom: this.paddedWireSegment(this.lineSet().adjacentWireSegment(lineIndex + 1)),
      mid: this.paddedWireSegment(match.groups?.wire ?? ''),
      top: this.paddedWireSegment(this.lineSet().adjacentWireSegment(lineIndex - 1))
    });
  }

  private boxWidthsAt(position: number): number[] {
    return this.wireRows().flatMap((wireRow) => wireRow.boxWidthsAt(position));
  }

  private eachStep(): StepSlice[][] {
    const result: StepSlice[][] = [];
    let position = 0;

    while (position < this.wireWidth()) {
      result.push(this.stepSlices(position));
      position += this.stepWidthAt(position);
    }

    return result;
  }

  private lineSet(): LineSet {
    this.lineSetCache ??= new LineSet(this.asciiArt);

    return this.lineSetCache;
  }

  private paddedWireSegment(segment: string | undefined): string {
    return ljust(segment ?? '', this.wireWidth());
  }

  private qubitCount(): number {
    return this.lineSet().parsedMidLines().length;
  }

  private stepSlices(position: number): StepSlice[] {
    const stepWidth = this.stepWidthAt(position);

    return this.wireRows().map((wireRow) => wireRow.stepSlice(position, stepWidth));
  }

  private stepWidthAt(position: number): number {
    const widths = this.boxWidthsAt(position);
    const width = widths.length > 0 ? Math.max(...widths) : undefined;

    if (width !== undefined) {
      return width;
    }

    if (this.wireWidth() - position >= CELL_WIDTH) {
      return CELL_WIDTH;
    }

    throw new AsciiCircuitParserError('ASCII parser lines must align to whole step cells');
  }

  private wireRows(): WireRow[] {
    return this.lineSet().parsedMidLines().map(([lineIndex, match]) => this.buildWireRow(lineIndex, match));
  }

  private wireWidth(): number {
    return this.lineSet().wireWidth();
  }
}

class AsciiStepParser {
  private readonly stepSlices: StepSlice[];

  constructor(stepSlices: StepSlice[]) {
    this.stepSlices = stepSlices;
  }

  toSlots(): unknown[] {
    const state = new AsciiStepParseState(this.stepSlices.length);

    for (const [qubit, stepSlice] of this.stepSlices.entries()) {
      this.applyMidCell(stepSlice, qubit, state);
    }

    return state.finish();
  }

  private applyMidCell(stepSlice: StepSlice, qubit: number, state: AsciiStepParseState): void {
    const action = this.slotActionFor(stepSlice);

    if (action !== 'empty') {
      state.mark(qubit, action);
    }
  }

  private slotActionFor(stepSlice: StepSlice): SlotAction {
    const gateSymbol = new AsciiGateSymbolResolver().resolve(stepSlice);

    if (gateSymbol) {
      return gateSymbol;
    }

    const action = new AsciiStepMidCell(stepSlice.mid).slotAction();

    if (action !== 'unsupported') {
      return action;
    }

    throw new AsciiCircuitParserError('ASCII parser currently supports boxed fixed gates and empty wires only');
  }
}

type SlotAction = 'control' | 'empty' | 'swap' | string;

class AsciiStepParseState {
  private readonly controls: number[] = [];
  private readonly gateTargets: number[] = [];
  private readonly slots: unknown[];
  private readonly swapTargets: number[] = [];

  constructor(qubitCount: number) {
    this.slots = Array.from({ length: qubitCount }, () => EMPTY_SLOT);
  }

  finish(): unknown[] {
    this.validateShape();

    return this.slots;
  }

  mark(qubit: number, action: SlotAction): void {
    if (action === 'control') {
      this.markControl(qubit);
    } else if (action === 'swap') {
      this.markSwap(qubit);
    } else {
      this.markGate(qubit, action);
    }
  }

  private markControl(qubit: number): void {
    this.slots[qubit] = CONTROL_SYMBOL;
    this.controls.push(qubit);
  }

  private markGate(qubit: number, gateSymbol: string): void {
    this.slots[qubit] = gateSymbol;
    this.gateTargets.push(qubit);
  }

  private markSwap(qubit: number): void {
    this.slots[qubit] = SWAP_SYMBOL;
    this.swapTargets.push(qubit);
  }

  private validateShape(): void {
    if (this.validShape()) {
      return;
    }

    throw new AsciiCircuitParserError('ASCII parser currently supports one target gate or one swap per step');
  }

  private validShape(): boolean {
    const noSpecialMarkers = this.controls.length === 0 && this.swapTargets.length === 0;
    const controlledGateStep =
      this.controls.length > 0 && this.gateTargets.length === 1 && this.swapTargets.length === 0;
    const swapStep = this.swapTargets.length === 2 && this.controls.length === 0 && this.gateTargets.length === 0;

    return noSpecialMarkers || controlledGateStep || swapStep;
  }
}

class AsciiStepMidCell {
  private static readonly BOX_PATTERN = /^┤(?<label>.+)├$/u;
  private static readonly CONTROL_PATTERN = /^─*■─*$/u;
  private static readonly EMPTY_PATTERN = /^─+$/u;
  private static readonly SWAP_PATTERN = /^─*X─*$/u;
  private static readonly VERTICAL_BRIDGE_PATTERN = /^─*│─*$/u;
  private readonly midCell: string;

  constructor(midCell: string) {
    this.midCell = midCell;
  }

  gateLabel(): string | undefined {
    return AsciiStepMidCell.BOX_PATTERN.exec(this.midCell)?.groups?.label?.trim();
  }

  slotAction(): 'control' | 'empty' | 'swap' | 'unsupported' {
    if (AsciiStepMidCell.CONTROL_PATTERN.test(this.midCell)) {
      return 'control';
    }

    if (AsciiStepMidCell.SWAP_PATTERN.test(this.midCell)) {
      return 'swap';
    }

    if (AsciiStepMidCell.EMPTY_PATTERN.test(this.midCell) || AsciiStepMidCell.VERTICAL_BRIDGE_PATTERN.test(this.midCell)) {
      return 'empty';
    }

    return 'unsupported';
  }
}

class AsciiGateSymbolResolver {
  resolve(stepSlice: StepSlice): string | undefined {
    const label = new AsciiStepMidCell(stepSlice.mid).gateLabel();

    if (!label) {
      return undefined;
    }

    const annotation = stepSlice.annotation.trim();

    if (/^[A-Za-z]+\(.+\)$/u.test(label)) {
      throw new AsciiCircuitParserError(ANGLED_GATE_ERROR);
    }

    return this.angledGateSymbolFor(label, annotation) ?? this.fixedGateSymbolFor(label, annotation);
  }

  private angledGateSymbolFor(label: string, annotation: string): string | undefined {
    if (!ANGLED_GATE_LABELS.has(label)) {
      return undefined;
    }

    if (annotation === '') {
      throw new AsciiCircuitParserError(ANGLED_GATE_ERROR);
    }

    return `${label}(${new AngleExpression(annotation).toString()})`;
  }

  private fixedGateSymbolFor(label: string, annotation: string): string {
    if (annotation !== '') {
      throw new AsciiCircuitParserError(UNEXPECTED_ANGLE_ERROR);
    }

    const symbol = FIXED_GATE_LABELS.get(label);

    if (!symbol) {
      throw new AsciiCircuitParserError(`unsupported ASCII gate label: ${JSON.stringify(label)}`);
    }

    return symbol;
  }
}

function charLength(value: string): number {
  return chars(value).length;
}

function chars(value: string): string[] {
  return [...value];
}

function ljust(value: string, width: number): string {
  const valueLength = charLength(value);

  if (width <= valueLength) {
    return value;
  }

  return value + ' '.repeat(width - valueLength);
}

function rstrip(value: string): string {
  return value.replace(/\s+$/u, '');
}

function sliceChars(value: string, start: number, length: number): string {
  return chars(value).slice(start, start + length).join('');
}
