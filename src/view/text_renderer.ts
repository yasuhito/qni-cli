import { CircuitFileError, type CircuitData } from '../circuit_file';
import {
  parseCircuitOperation,
  parseCircuitOperationSlot,
  type ParsedCircuitOperation
} from '../circuit_operation';

const CONTROL_SYMBOL = '•';
const DIM_SUFFIX_PATTERN = /┤ ([A-Z])([xyz†])├/gu;
const DIM_WHITE = '\u001B[37;2m';
const EMPTY_SLOT = 1;
const RESET_FORMATTING = '\u001B[0m';
const SQRT_X_SYMBOL = 'X^½';
const SQRT_X_VIEW_SYMBOL = '√X';

class ConnectedLineStyle {
  readonly background: string;
  private readonly connect: string;
  private readonly format: string;
  private readonly pad: string;

  constructor(options: { background?: string; connect?: string; format?: string; pad?: string } = {}) {
    this.background = options.background ?? ' ';
    this.connect = options.connect ?? ' ';
    this.format = options.format ?? '%s';
    this.pad = options.pad ?? ' ';
  }

  render(width: number): string {
    return format(this.format, center(this.connect, width, this.pad));
  }
}

class MidLineStyle {
  readonly background: string;
  private readonly format: string;
  private readonly padding: string;

  constructor(options: { background?: string; format?: string; padding?: string } = {}) {
    this.background = options.background ?? ' ';
    this.format = options.format ?? '%s';
    this.padding = options.padding ?? ' ';
  }

  render(label: string, width: number): string {
    return format(this.format, center(label, width, this.padding));
  }
}

class CellStyle {
  readonly bot: ConnectedLineStyle;
  readonly mid: MidLineStyle;
  readonly top: ConnectedLineStyle;

  constructor(options: { bot: ConnectedLineStyle; mid: MidLineStyle; top: ConnectedLineStyle }) {
    this.bot = options.bot;
    this.mid = options.mid;
    this.top = options.top;
  }
}

const DEFAULT_STYLE = new CellStyle({
  bot: new ConnectedLineStyle(),
  mid: new MidLineStyle(),
  top: new ConnectedLineStyle()
});

class DrawElement {
  protected readonly annotationText: string;
  protected readonly label: string;
  protected layerWidth = 0;
  protected readonly style: CellStyle;

  constructor(label = '', style = DEFAULT_STYLE, annotationText = '') {
    this.annotationText = annotationText;
    this.label = label;
    this.style = style;
  }

  annotation(): string {
    return center(this.annotationText, Math.max(this.layerWidth, charLength(this.annotationText)), ' ');
  }

  bot(): string {
    return this.renderConnectedLine(this.style.bot);
  }

  expandToLayer(width: number): void {
    this.layerWidth = width;
  }

  length(): number {
    return Math.max(
      charLength(this.annotation()),
      charLength(this.top()),
      charLength(this.mid()),
      charLength(this.bot())
    );
  }

  mid(): string {
    const middleStyle = this.style.mid;

    return center(middleStyle.render(this.label, this.width()), this.layerWidth, middleStyle.background);
  }

  top(): string {
    return this.renderConnectedLine(this.style.top);
  }

  protected width(): number {
    return charLength(this.label);
  }

  private renderConnectedLine(lineStyle: ConnectedLineStyle): string {
    return center(lineStyle.render(this.width()), this.layerWidth, lineStyle.background);
  }
}

class BoxOnQuWire extends DrawElement {
  private static readonly COMPACT_LABEL_PATTERN = /^[A-Z][xyz†]$/u;
  private static readonly COMPACT_FORMAT = ['┌─%s┐', '┤ %s├', '└─%s┘'] as const;
  private static readonly LEADING_COMPACT_FORMAT = ['┌─%s┐', '┤%s ├', '└─%s┘'] as const;
  private static readonly LEADING_COMPACT_LABEL_PATTERN = /^√[A-Z]$/u;
  private static readonly STANDARD_FORMAT = ['┌─%s─┐', '┤ %s ├', '└─%s─┘'] as const;

  static build(label: string, options: { botConnect?: string; topConnect?: string } = {}): BoxOnQuWire {
    return new BoxOnQuWire(label, {
      formatParts: BoxOnQuWire.formatFor(label),
      ...options
    });
  }

  static formatFor(label: string): readonly [string, string, string] {
    if (BoxOnQuWire.COMPACT_LABEL_PATTERN.test(label)) {
      return BoxOnQuWire.COMPACT_FORMAT;
    }

    if (BoxOnQuWire.LEADING_COMPACT_LABEL_PATTERN.test(label)) {
      return BoxOnQuWire.LEADING_COMPACT_FORMAT;
    }

    return BoxOnQuWire.STANDARD_FORMAT;
  }

  private static styleFor(options: {
    botConnect: string;
    formatParts: readonly [string, string, string];
    topConnect: string;
  }): CellStyle {
    return new CellStyle({
      bot: new ConnectedLineStyle({ connect: options.botConnect, format: options.formatParts[2], pad: '─' }),
      mid: new MidLineStyle({ background: '─', format: options.formatParts[1] }),
      top: new ConnectedLineStyle({ connect: options.topConnect, format: options.formatParts[0], pad: '─' })
    });
  }

  constructor(
    label: string,
    options: {
      annotationText?: string;
      botConnect?: string;
      formatParts?: readonly [string, string, string];
      topConnect?: string;
    } = {}
  ) {
    super(
      label,
      BoxOnQuWire.styleFor({
        botConnect: options.botConnect ?? '─',
        formatParts: options.formatParts ?? BoxOnQuWire.STANDARD_FORMAT,
        topConnect: options.topConnect ?? '─'
      }),
      options.annotationText ?? ''
    );
  }
}

class AngledBoxOnQuWire extends BoxOnQuWire {
  annotation(): string {
    const annotationWidth = Math.max(this.layerWidth, charLength(this.annotationText));
    const annotationTextLength = charLength(this.annotationText);

    if (annotationWidth === annotationTextLength) {
      return this.annotationText;
    }

    const padding = annotationWidth - annotationTextLength;
    const leftPadding = Math.min(Math.floor(padding / 2) + 1, padding);

    return ljust(rjust(this.annotationText, annotationTextLength + leftPadding), annotationWidth);
  }
}

class DirectOnQuWire extends DrawElement {
  constructor(
    label: string,
    options: { annotationText?: string; botConnect?: string; topConnect?: string } = {}
  ) {
    super(
      label,
      new CellStyle({
        bot: new ConnectedLineStyle({ connect: options.botConnect ?? ' ', format: ' %s ' }),
        mid: new MidLineStyle({ background: '─', format: '─%s─', padding: '─' }),
        top: new ConnectedLineStyle({ connect: options.topConnect ?? ' ', format: ' %s ' })
      }),
      options.annotationText ?? ''
    );
  }
}

class Bullet extends DirectOnQuWire {
  constructor(options: { botConnect?: string; topConnect?: string } = {}) {
    super('■', options);
  }
}

class Ex extends DirectOnQuWire {
  constructor(options: { annotationText?: string; botConnect?: string; topConnect?: string } = {}) {
    super('X', options);
  }
}

class VerticalBridge extends DirectOnQuWire {
  constructor() {
    super('│', { botConnect: '│', topConnect: '│' });
  }
}

class EmptyWire extends DrawElement {
  constructor(wire = '─') {
    super(
      '',
      new CellStyle({
        bot: new ConnectedLineStyle(),
        mid: new MidLineStyle({ background: wire, padding: wire }),
        top: new ConnectedLineStyle()
      })
    );
  }
}

class TextGateCell {
  private static readonly ANGLED_GATE_PATTERN = /^(?<symbol>[A-Za-z]+)\((?<angle>.+)\)$/u;
  private readonly botConnect: string;
  private readonly operation: ParsedCircuitOperation;
  private readonly topConnect: string;

  constructor(slot: unknown, options: { botConnect?: string; topConnect?: string } = {}) {
    this.operation = parseCircuitOperation(slot);
    this.topConnect = options.topConnect ?? '─';
    this.botConnect = options.botConnect ?? '─';
  }

  build(): DrawElement {
    const angledMatch = this.angledMatch();

    if (!angledMatch?.groups) {
      return BoxOnQuWire.build(this.label(), {
        botConnect: this.botConnect,
        topConnect: this.topConnect
      });
    }

    return new AngledBoxOnQuWire(this.label(), {
      annotationText: this.renderedAngle(angledMatch.groups.angle),
      botConnect: this.botConnect,
      formatParts: BoxOnQuWire.formatFor(this.label()),
      topConnect: this.topConnect
    });
  }

  private angledMatch(): RegExpExecArray | null {
    return TextGateCell.ANGLED_GATE_PATTERN.exec(this.operation.symbol);
  }

  private label(): string {
    const angledMatch = this.angledMatch();
    const baseLabel =
      this.operation.symbol === SQRT_X_SYMBOL
        ? SQRT_X_VIEW_SYMBOL
        : (angledMatch?.groups?.symbol ?? this.measurementLabel());

    return this.operation.classicalCondition === undefined
      ? baseLabel
      : `${baseLabel}<${this.operation.classicalCondition}`;
  }

  private measurementLabel(): string {
    return this.operation.measurementName === undefined
      ? this.operation.symbol
      : `${this.operation.symbol}>${this.operation.measurementName}`;
  }

  private renderedAngle(angle: string): string {
    return angle.replaceAll('theta', 'θ').replace(/(?<=\d)\*θ/gu, 'θ');
  }
}

class GatePlacement {
  readonly qubit: number;
  private readonly slot: unknown;

  constructor(slot: unknown, qubit: number) {
    this.slot = slot;
    this.qubit = qubit;
  }

  cell(options: { botConnect?: string; topConnect?: string } = {}): DrawElement {
    return new TextGateCell(this.slot, options).build();
  }

  emptyWireOn(layer: TextLayer): boolean {
    return layer.emptyWireAt(this.qubit);
  }

  placeOn(layer: TextLayer, options: { botConnect?: string; topConnect?: string } = {}): void {
    layer.place(this.qubit, this.cell(options));
  }

  placeOnIfEmpty(layer: TextLayer): void {
    if (this.emptyWireOn(layer)) {
      this.placeOn(layer);
    }
  }
}

class TextStep {
  private readonly rawStep: unknown[];

  constructor(rawStep: unknown[]) {
    this.rawStep = rawStep;
  }

  controlQubits(): number[] {
    return this.rawStep.flatMap((slot, index) => (slot === CONTROL_SYMBOL ? [index] : []));
  }

  controlledTarget(): GatePlacement | undefined {
    const controlQubits = this.controlQubits();
    const targetedGates = this.targetedGates();

    if (controlQubits.length > 0 && targetedGates.length === 1) {
      return targetedGates[0];
    }

    return undefined;
  }

  emptySlot(qubit: number): boolean {
    return this.rawStep[qubit] === EMPTY_SLOT;
  }

  placeSingleGateOn(
    layer: TextLayer,
    qubit: number,
    options: { botConnect?: string; topConnect?: string } = {}
  ): void {
    const placement = this.singleGateAt(qubit);
    if (placement?.emptyWireOn(layer)) {
      placement.placeOn(layer, options);
    }
  }

  placeSingleGatesOn(layer: TextLayer): void {
    for (const placement of this.singleGates()) {
      placement.placeOnIfEmpty(layer);
    }
  }

  swapPair(): readonly [number, number] | undefined {
    const swapQubits = this.rawStep.flatMap((slot, index) =>
      this.operationKind(slot) === 'swap' ? [index] : []
    );

    if (swapQubits.length !== 2) {
      return undefined;
    }

    return [Math.min(...swapQubits), Math.max(...swapQubits)];
  }

  swapCondition(): string | undefined {
    const conditions = this.rawStep.flatMap((slot) => {
      if (this.operationKind(slot) !== 'swap') {
        return [];
      }

      return [parseCircuitOperation(slot).classicalCondition];
    });

    if (new Set(conditions).size > 1) {
      throw new CircuitFileError('SWAP targets must use the same classical condition');
    }

    return conditions[0];
  }

  private singleGateAt(qubit: number): GatePlacement | undefined {
    const slot = this.rawStep[qubit];
    const kind = this.operationKind(slot);
    return kind === 'gate' || kind === 'measurement' ? new GatePlacement(slot, qubit) : undefined;
  }

  private singleGates(): GatePlacement[] {
    return this.rawStep.flatMap((_slot, qubit) => {
      const placement = this.singleGateAt(qubit);
      return placement === undefined ? [] : [placement];
    });
  }

  private operationKind(slot: unknown): 'gate' | 'measurement' | 'swap' | undefined {
    return parseCircuitOperationSlot(slot)?.kind;
  }

  private targetedGates(): GatePlacement[] {
    return this.rawStep.flatMap((slot, qubit) =>
      this.operationKind(slot) === 'gate' ? [new GatePlacement(slot, qubit)] : []
    );
  }
}

class TextLayer {
  private readonly cells: DrawElement[];

  constructor(qubits: number) {
    this.cells = Array.from({ length: qubits }, () => new EmptyWire());
  }

  emptyWireAt(qubit: number): boolean {
    return this.fetch(qubit) instanceof EmptyWire;
  }

  fetch(qubit: number): DrawElement {
    const cell = this.cells[qubit];

    if (!cell) {
      throw new CircuitFileError(`qubit index out of bounds: ${qubit} (qubits: ${this.cells.length})`);
    }

    return cell;
  }

  normalizeWidth(): TextLayer {
    const longest = Math.max(...this.cells.map((cell) => cell.length()));

    for (const cell of this.cells) {
      cell.expandToLayer(longest);
    }

    return this;
  }

  place(qubit: number, cell: DrawElement): void {
    this.cells[qubit] = cell;
  }

  placeSwapEndpoint(
    qubit: number,
    options: { annotationText?: string; botConnect?: string; topConnect?: string } = {}
  ): void {
    this.place(qubit, new Ex(options));
  }

  toArray(): DrawElement[] {
    return this.cells;
  }
}

class VerticalConnectionSpan {
  private readonly maxQubit: number;
  private readonly minQubit: number;

  constructor(qubits: number[]) {
    this.minQubit = Math.min(...qubits);
    this.maxQubit = Math.max(...qubits);
  }

  bridgeQubits(): number[] {
    return range(this.minQubit + 1, this.maxQubit);
  }

  connectorsFor(qubit: number): { botConnect: string; topConnect: string } {
    return {
      botConnect: qubit < this.maxQubit ? '│' : ' ',
      topConnect: qubit > this.minQubit ? '│' : ' '
    };
  }
}

class ControlSpan {
  private readonly maxQubit: number;
  private readonly minQubit: number;
  private readonly targetQubit: number;

  constructor(controlQubits: number[], targetQubit: number) {
    this.targetQubit = targetQubit;
    this.minQubit = Math.min(...controlQubits, targetQubit);
    this.maxQubit = Math.max(...controlQubits, targetQubit);
  }

  bridgeQubits(): number[] {
    return range(this.minQubit + 1, this.maxQubit);
  }

  connectorsFor(qubit: number): { botConnect: string; topConnect: string } {
    return {
      botConnect: qubit < this.maxQubit ? '│' : ' ',
      topConnect: qubit > this.minQubit ? '│' : ' '
    };
  }

  bulletFor(qubit: number): Bullet {
    return new Bullet({
      botConnect: qubit < this.maxQubit ? '│' : ' ',
      topConnect: qubit > this.minQubit ? '│' : ' '
    });
  }

  targetConnectors(): { botConnect: string; topConnect: string } {
    return {
      botConnect: this.targetQubit < this.maxQubit ? '┬' : '─',
      topConnect: this.targetQubit > this.minQubit ? '┴' : '─'
    };
  }
}

class ControlledLayerPlacement {
  private readonly layer: TextLayer;
  private readonly span: ControlSpan;
  private readonly step: TextStep;
  private readonly target: GatePlacement;

  constructor(layer: TextLayer, step: TextStep, target: GatePlacement) {
    this.layer = layer;
    this.step = step;
    this.target = target;
    this.span = new ControlSpan(step.controlQubits(), target.qubit);
  }

  apply(): void {
    this.placeControlBullets();
    this.target.placeOn(this.layer, this.span.targetConnectors());
    this.placeControlBridges();
  }

  private placeControlBridges(): void {
    for (const qubit of this.span.bridgeQubits()) {
      if (this.step.emptySlot(qubit)) {
        this.layer.place(qubit, new VerticalBridge());
      } else {
        this.step.placeSingleGateOn(this.layer, qubit, this.span.connectorsFor(qubit));
      }
    }
  }

  private placeControlBullets(): void {
    for (const qubit of this.step.controlQubits()) {
      this.layer.place(qubit, this.span.bulletFor(qubit));
    }
  }
}

class TextStepLayerBuilder {
  private readonly qubits: number;
  private readonly step: TextStep;

  constructor(rawStep: unknown[], qubits: number) {
    this.step = new TextStep(rawStep);
    this.qubits = qubits;
  }

  build(): DrawElement[] {
    return this.populatedLayer().normalizeWidth().toArray();
  }

  private placeControlledGate(layer: TextLayer): void {
    const target = this.step.controlledTarget();

    if (target) {
      new ControlledLayerPlacement(layer, this.step, target).apply();
    }
  }

  private placeSingleGates(layer: TextLayer): void {
    this.step.placeSingleGatesOn(layer);
  }

  private placeSwap(layer: TextLayer): void {
    const swapPair = this.step.swapPair();

    if (!swapPair) {
      return;
    }

    const [topQubit, bottomQubit] = swapPair;
    const span = new VerticalConnectionSpan([...this.step.controlQubits(), topQubit, bottomQubit]);

    for (const controlQubit of this.step.controlQubits()) {
      layer.place(controlQubit, new Bullet(span.connectorsFor(controlQubit)));
    }

    layer.placeSwapEndpoint(topQubit, {
      ...span.connectorsFor(topQubit),
      annotationText: this.step.swapCondition() ? `<${this.step.swapCondition()}` : undefined
    });
    layer.placeSwapEndpoint(bottomQubit, span.connectorsFor(bottomQubit));
    this.placeSwapBridges(layer, span);
  }

  private placeSwapBridges(layer: TextLayer, span: VerticalConnectionSpan): void {
    for (const qubit of span.bridgeQubits()) {
      if (this.step.emptySlot(qubit)) {
        layer.place(qubit, new VerticalBridge());
      }
    }
  }

  private populatedLayer(): TextLayer {
    const layer = new TextLayer(this.qubits);

    this.placeSwap(layer);
    this.placeControlledGate(layer);
    this.placeSingleGates(layer);

    return layer;
  }
}

class TextLineMerger {
  private static readonly INTERSECTION_MERGES = new Map<string, string>([
    [mergeKey('┬', '═'), '╪'],
    [mergeKey('│', '═'), '╪'],
    [mergeKey('┬', '─'), '┼'],
    [mergeKey('│', '─'), '┼'],
    [mergeKey('║', '═'), '╬'],
    [mergeKey('╥', '═'), '╬'],
    [mergeKey('║', '─'), '╫'],
    [mergeKey('╥', '─'), '╫']
  ]);
  private static readonly TOP_CORNER_MERGES = new Map<string, string>([
    [mergeKey('└', '┌'), '├'],
    [mergeKey('┘', '┐'), '┤']
  ]);
  private readonly blankBottomDoubleVerticalChars = new Set(['║', '╫', '╬']);
  private readonly blankBottomVerticalChars = new Set(['│', '┼', '╪']);
  private readonly bottomPriorityVerticalChars = new Set(['│', '┼', '╪', '┬']);
  private readonly bottomTopCornerChars = new Set(['┐', '┌']);
  private readonly topCornerBottomChars = new Set(['║', '│']);
  private readonly topCornerChars = new Set(['┬', '╥']);
  private readonly topPriorityBottomCorners = new Set(['┘', '└']);

  mergeBottom(topLine: string, bottomLine: string): string {
    return this.merge(topLine, bottomLine, (topChar, bottomChar) => {
      if (bottomChar === ' ') {
        return this.mergeBlankBottomWithBottomPriority(topChar);
      }

      return undefined;
    });
  }

  mergeTop(topLine: string, bottomLine: string): string {
    return this.merge(topLine, bottomLine, (topChar, bottomChar) => {
      if (bottomChar === ' ') {
        return this.mergeBlankBottomWithTopPriority(topChar);
      }

      return this.mergeTopPriority(topChar, bottomChar);
    });
  }

  private merge(
    topLine: string,
    bottomLine: string,
    customMerge: (topChar: string, bottomChar: string) => string | undefined
  ): string {
    const topChars = chars(topLine);
    const bottomChars = chars(bottomLine);

    return topChars.map((topChar, index) => {
      const bottomChar = bottomChars[index] ?? ' ';

      if (topChar === bottomChar) {
        return topChar;
      }

      if (topChar === ' ') {
        return bottomChar;
      }

      return (
        customMerge(topChar, bottomChar) ??
        TextLineMerger.INTERSECTION_MERGES.get(mergeKey(topChar, bottomChar)) ??
        bottomChar
      );
    }).join('');
  }

  private mergeBlankBottomCommon(topChar: string): string | undefined {
    if (this.blankBottomVerticalChars.has(topChar)) {
      return '│';
    }

    if (this.blankBottomDoubleVerticalChars.has(topChar)) {
      return '║';
    }

    return undefined;
  }

  private mergeBlankBottomWithBottomPriority(topChar: string): string {
    if (this.bottomPriorityVerticalChars.has(topChar)) {
      return '│';
    }

    if (topChar === '╥') {
      return '║';
    }

    return this.mergeBlankBottomCommon(topChar) ?? ' ';
  }

  private mergeBlankBottomWithTopPriority(topChar: string): string {
    return this.mergeBlankBottomCommon(topChar) ?? topChar;
  }

  private mergeTopPriority(topChar: string, bottomChar: string): string | undefined {
    if (this.topCornerChars.has(topChar) && this.topCornerBottomChars.has(bottomChar)) {
      return topChar;
    }

    const cornerMerge = TextLineMerger.TOP_CORNER_MERGES.get(mergeKey(topChar, bottomChar));

    if (cornerMerge) {
      return cornerMerge;
    }

    if (this.bottomTopCornerChars.has(bottomChar)) {
      return '┬';
    }

    if (this.topPriorityBottomCorners.has(topChar) && bottomChar === '─') {
      return '┴';
    }

    return undefined;
  }
}

class TextWireLines {
  private readonly layers: DrawElement[][];
  private readonly qubit: number;
  private readonly wireFrame: { label: string; labelWidth: number; prefix: string };

  constructor(
    layers: DrawElement[][],
    qubit: number,
    options: { wireLabel: string; wireLabelWidth: number; wirePrefix: string }
  ) {
    this.layers = layers;
    this.qubit = qubit;
    this.wireFrame = {
      label: options.wireLabel,
      labelWidth: options.wireLabelWidth,
      prefix: options.wirePrefix
    };
  }

  toArray(): string[] {
    return [
      this.framedLine('annotation'),
      this.framedLine('top'),
      this.labeledMidLine(),
      this.framedLine('bot')
    ];
  }

  private cells(): DrawElement[] {
    return this.layers.map((layer) => layer[this.qubit]);
  }

  private framedLine(part: 'annotation' | 'bot' | 'top'): string {
    return this.wireFrame.prefix + this.renderedRow(part);
  }

  private labeledMidLine(): string {
    return rjust(this.wireFrame.label, this.wireFrame.labelWidth) + this.renderedRow('mid');
  }

  private renderedRow(part: 'annotation' | 'bot' | 'mid' | 'top'): string {
    return this.cells().map((cell) => cell[part]()).join('');
  }
}

class TextWireCanvas {
  private readonly lineMerger: TextLineMerger;
  private readonly lines: string[] = [];
  private previousBottom: string | undefined;

  constructor(lineMerger: TextLineMerger) {
    this.lineMerger = lineMerger;
  }

  append(wireLines: string[]): void {
    const [annotationLine, topLine, midLine, bottomLine] = wireLines;

    if (annotationLine.trim() === '') {
      this.appendBodyLines(this.mergedTopLine(topLine), midLine, bottomLine);
    } else {
      const connectedAnnotationLine = this.annotationLineWithConnections(annotationLine);

      this.removeConnectionOnlyPreviousBottom();
      this.appendAnnotationLine(connectedAnnotationLine);
      this.appendBodyLines(topLine, midLine, bottomLine);
    }

    this.previousBottom = bottomLine;
  }

  toArray(): string[] {
    return trimmedLines(this.lines);
  }

  private annotationLineWithConnections(annotationLine: string): string {
    if (!this.previousBottom) {
      return annotationLine;
    }

    return this.lineMerger.mergeBottom(this.previousBottom, annotationLine);
  }

  private appendAnnotationLine(annotationLine: string): void {
    this.lines.push(annotationLine);
  }

  private appendBodyLines(mergedTopLine: string, midLine: string, bottomLine: string): void {
    this.lines.push(mergedTopLine);
    this.appendMergedLine(midLine);
    this.appendMergedLine(bottomLine);
  }

  private appendMergedLine(nextLine: string): void {
    const currentLine = this.lines[this.lines.length - 1];
    this.lines.push(this.lineMerger.mergeBottom(currentLine, nextLine));
  }

  private removeConnectionOnlyPreviousBottom(): void {
    if (this.previousBottom && !/[└┘]/u.test(this.previousBottom)) {
      this.lines.pop();
    }
  }

  private mergedTopLine(topLine: string): string {
    if (!this.previousBottom) {
      return topLine;
    }

    const previousLine = this.lines.pop();

    if (previousLine === undefined) {
      return topLine;
    }

    return this.lineMerger.mergeTop(previousLine, topLine);
  }
}

export type TextRendererStyle = 'colorized' | 'plain';

export class TextRenderer {
  private readonly circuit: CircuitData;
  private readonly style: TextRendererStyle;

  constructor(circuit: CircuitData, options: { style?: TextRendererStyle } = {}) {
    this.circuit = circuit;
    this.style = options.style ?? 'plain';
  }

  render(): string {
    const output = this.drawWires(this.stepLayers()).join('\n');

    if (this.style !== 'colorized') {
      return output;
    }

    return colorizeCompactSuffixes(output);
  }

  private drawWires(layers: DrawElement[][]): string[] {
    const canvas = new TextWireCanvas(new TextLineMerger());

    for (let qubit = 0; qubit < this.circuit.qubits; qubit += 1) {
      canvas.append(this.wireLines(layers, qubit));
    }

    return canvas.toArray();
  }

  private stepLayers(): DrawElement[][] {
    return this.circuit.cols.map((rawStep) => new TextStepLayerBuilder(rawStep, this.circuit.qubits).build());
  }

  private wireLabel(qubit: number): string {
    return `q${qubit}: `;
  }

  private wireLabelWidth(): number {
    return charLength(this.wireLabel(this.circuit.qubits - 1));
  }

  private wireLines(layers: DrawElement[][], qubit: number): string[] {
    return new TextWireLines(layers, qubit, {
      wireLabel: this.wireLabel(qubit),
      wireLabelWidth: this.wireLabelWidth(),
      wirePrefix: ' '.repeat(this.wireLabelWidth())
    }).toArray();
  }
}

export function colorizeCompactSuffixes(output: string): string {
  return output.replace(DIM_SUFFIX_PATTERN, (_match, base: string, suffix: string) => {
    return `┤ ${base}${DIM_WHITE}${suffix}${RESET_FORMATTING}├`;
  });
}

function center(value: string, width: number, pad = ' '): string {
  const valueLength = charLength(value);

  if (width <= valueLength) {
    return value;
  }

  const totalPadding = width - valueLength;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  return pad.repeat(leftPadding) + value + pad.repeat(rightPadding);
}

function charLength(value: string): number {
  return chars(value).length;
}

function chars(value: string): string[] {
  return [...value];
}

function format(template: string, value: string): string {
  return template.replace('%s', value);
}

function ljust(value: string, width: number, pad = ' '): string {
  const valueLength = charLength(value);

  if (width <= valueLength) {
    return value;
  }

  return value + pad.repeat(width - valueLength);
}

function mergeKey(topChar: string, bottomChar: string): string {
  return `${topChar}\0${bottomChar}`;
}

function range(start: number, endExclusive: number): number[] {
  return Array.from({ length: Math.max(0, endExclusive - start) }, (_value, index) => start + index);
}

function rjust(value: string, width: number, pad = ' '): string {
  const valueLength = charLength(value);

  if (width <= valueLength) {
    return value;
  }

  return pad.repeat(width - valueLength) + value;
}

function trimmedLines(lines: string[]): string[] {
  return trimTrailingBlankLines(trimLeadingBlankLines(lines)).map((line) => line.replace(/\s+$/u, ''));
}

function trimLeadingBlankLines(lines: string[]): string[] {
  const firstNonBlank = lines.findIndex((line) => line.trim() !== '');

  return firstNonBlank === -1 ? [] : lines.slice(firstNonBlank);
}

function trimTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;

  while (end > 0 && lines[end - 1].trim() === '') {
    end -= 1;
  }

  return lines.slice(0, end);
}
