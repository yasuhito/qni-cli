import type { CircuitData } from '../circuit_file';
import { parseCircuitOperationSlot, type ParsedCircuitOperation } from '../circuit_operation';
import type { ExportTheme, QuantikzCaptionOptions } from './quantikz_latex';

const CONTROL_SYMBOL = '•';
const EMPTY_SLOT = 1;
const ROW_HEIGHT = 64;
const LABEL_WIDTH = 72;
const MIN_COLUMN_WIDTH = 64;
const GATE_HEIGHT = 34;
const MARGIN = 16;

export interface CircuitSvgOptions extends QuantikzCaptionOptions {
  readonly theme: ExportTheme;
}

interface Placement {
  readonly operation: ParsedCircuitOperation;
  readonly qubit: number;
}

class SvgStep {
  readonly controls: number[];
  readonly measurements: Placement[];
  readonly operations: Placement[];
  readonly step: number;
  readonly swaps: Placement[];
  readonly width: number;

  constructor(slots: unknown[], step: number) {
    this.step = step;
    this.controls = slots.flatMap((slot, qubit) => slot === CONTROL_SYMBOL ? [qubit] : []);
    this.operations = slots.flatMap((slot, qubit) => {
      const operation = operationAt(slot);
      return operation === undefined ? [] : [{ operation, qubit }];
    });
    this.measurements = this.operations.filter(({ operation }) => operation.kind === 'measurement');
    this.swaps = this.operations.filter(({ operation }) => operation.kind === 'swap');
    const labels = this.operations.map(({ operation }) => displayLabel(operation));
    const longest = Math.max(1, ...labels.map((label) => [...label].length));
    this.width = Math.max(MIN_COLUMN_WIDTH, longest * 8 + 28);
  }

  get controlledTarget(): Placement | undefined {
    if (this.controls.length === 0 || this.swaps.length > 0) {
      return undefined;
    }

    const targets = this.operations.filter(({ operation }) => operation.kind === 'gate');
    if (targets.length !== 1) {
      throw new Error(`unsupported controlled step: ${JSON.stringify(this.operations)}`);
    }
    return targets[0];
  }

  validate(): void {
    if (this.swaps.length === 0) {
      return;
    }
    if (this.swaps.length !== 2 || this.operations.some(({ operation }) => operation.kind === 'gate')) {
      throw new Error(`unsupported swap step: ${JSON.stringify(this.operations)}`);
    }
    if (new Set(this.swaps.map(({ operation }) => operation.classicalCondition)).size !== 1) {
      throw new Error('SWAP targets must use the same classical condition');
    }
  }
}

export class CircuitSvg {
  private readonly caption: string;
  private readonly captionPosition: string;
  private readonly captionSize: number;
  private readonly circuit: CircuitData;
  private readonly columnCenters: number[];
  private readonly height: number;
  private readonly steps: SvgStep[];
  private readonly theme: ExportTheme;
  private readonly width: number;

  constructor(circuit: CircuitData, options: CircuitSvgOptions) {
    this.caption = options.caption ?? '';
    this.captionPosition = options.captionPosition ?? 'bottom';
    this.captionSize = options.captionSize ?? 12;
    this.circuit = circuit;
    this.theme = options.theme;
    this.steps = circuit.cols.map((slots, step) => new SvgStep(slots, step));
    for (const svgStep of this.steps) {
      svgStep.validate();
    }
    const layout = columnLayout(this.steps);
    this.columnCenters = layout.centers;
    const captionWidth = this.caption === '' ? 0 : [...this.caption].length * this.captionSize + MARGIN * 2;
    this.width = Math.max(layout.width, captionWidth);
    this.height = Math.max(ROW_HEIGHT, this.circuit.qubits * ROW_HEIGHT) + this.captionSpace;
  }

  render(): string {
    const lines = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" role="img" aria-label="Quantum circuit">`,
      `<style>svg{color:${this.theme === 'light' ? '#111' : '#fff'}}text{fill:currentColor;font-family:"DejaVu Sans",sans-serif;font-size:14px}.wire,.connection,.gate-box,.meter-box,.meter-mark,.target-mark,.swap-mark{stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.wire,.connection,.meter-mark,.target-mark,.swap-mark{fill:none}.control-dot{fill:currentColor}.label{font-size:13px}.annotation{font-size:11px}</style>`,
      ...this.topCaption,
      ...this.wires,
      ...this.steps.flatMap((step, index) => this.renderStep(step, this.columnCenters[index])),
      ...this.bottomCaption,
      '</svg>'
    ];
    return lines.join('\n');
  }

  private get backgroundColor(): string {
    return this.theme === 'light' ? '#fff' : '#000';
  }

  private get bottomCaption(): string[] {
    return this.caption !== '' && this.captionPosition === 'bottom'
      ? [this.captionText('bottom', this.circuitHeight + MARGIN + this.captionSize)]
      : [];
  }

  private get captionSpace(): number {
    return this.caption === '' ? 0 : Math.ceil(this.captionSize * 1.3) + MARGIN * 2;
  }

  private captionText(position: 'bottom' | 'top', y: number): string {
    return `<text class="caption" data-caption-position="${position}" style="font-size:${this.captionSize}px" x="${this.width / 2}" y="${y}" text-anchor="middle">${escapeXml(this.caption)}</text>`;
  }

  private get circuitHeight(): number {
    return Math.max(ROW_HEIGHT, this.circuit.qubits * ROW_HEIGHT);
  }

  private renderControlLines(step: SvgStep, x: number, connectedQubits: number[], targetQubit: number): string[] {
    const minQubit = Math.min(...connectedQubits);
    const maxQubit = Math.max(...connectedQubits);
    return [
      `<line class="connection" data-operation="control-line" data-step="${step.step}" data-from-qubit="${minQubit}" data-to-qubit="${maxQubit}" data-target-qubit="${targetQubit}" x1="${x}" y1="${this.y(minQubit)}" x2="${x}" y2="${this.y(maxQubit)}"/>`,
      ...step.controls.map((qubit) => `<circle class="control-dot" data-operation="control" data-step="${step.step}" data-qubit="${qubit}" data-target-qubit="${targetQubit}" cx="${x}" cy="${this.y(qubit)}" r="5"/>`)
    ];
  }

  private renderControlledGate(step: SvgStep, x: number, target: Placement): string[] {
    const lines = this.renderControlLines(step, x, [...step.controls, target.qubit], target.qubit);
    return target.operation.symbol === 'X'
      ? [...lines, ...this.renderTarget(step.step, target, x)]
      : [...lines, ...this.renderGate(step.step, target, x)];
  }

  private renderGate(step: number, placement: Placement, x: number): string[] {
    const label = displayLabel(placement.operation);
    const width = Math.max(38, [...label].length * 8 + 18);
    const y = this.y(placement.qubit);
    return [
      `<g data-operation="gate" data-step="${step}" data-qubit="${placement.qubit}">`,
      `<rect class="gate-box" x="${x - width / 2}" y="${y - GATE_HEIGHT / 2}" width="${width}" height="${GATE_HEIGHT}" rx="3" fill="${this.backgroundColor}"/>`,
      this.text(x, y + 5, label),
      '</g>'
    ];
  }

  private renderMeasurement(step: number, placement: Placement, x: number): string[] {
    const y = this.y(placement.qubit);
    const name = placement.operation.measurementName;
    return [
      `<g data-operation="measurement" data-step="${step}" data-qubit="${placement.qubit}">`,
      `<rect class="meter-box" x="${x - 22}" y="${y - 17}" width="44" height="34" rx="3" fill="${this.backgroundColor}"/>`,
      `<path class="meter-mark" d="M ${x - 12} ${y + 8} A 13 13 0 0 1 ${x + 12} ${y + 8} M ${x} ${y + 5} L ${x + 9} ${y - 7}"/>`,
      ...(name === undefined ? [] : [this.text(x + 28, y - 12, `>${name}`, undefined, 'annotation')]),
      '</g>'
    ];
  }

  private renderStep(step: SvgStep, x: number): string[] {
    if (step.swaps.length > 0) {
      return this.renderSwap(step, x);
    }
    const target = step.controlledTarget;
    const controlledLines = target === undefined ? [] : this.renderControlledGate(step, x, target);
    const controlledQubit = target?.qubit;
    return [
      ...controlledLines,
      ...step.operations.flatMap((placement) => {
        if (placement.qubit === controlledQubit) {
          return [];
        }
        return placement.operation.kind === 'measurement'
          ? this.renderMeasurement(step.step, placement, x)
          : this.renderGate(step.step, placement, x);
      })
    ];
  }

  private renderSwap(step: SvgStep, x: number): string[] {
    const [first, second] = [...step.swaps].sort((left, right) => left.qubit - right.qubit);
    const connectedQubits = [...step.controls, first.qubit, second.qubit];
    const lines = step.controls.length > 0
      ? this.renderControlLines(step, x, connectedQubits, nearestSwapQubit(step.controls[0], first.qubit, second.qubit))
      : [`<line class="connection" data-operation="swap-line" data-step="${step.step}" data-from-qubit="${first.qubit}" data-to-qubit="${second.qubit}" x1="${x}" y1="${this.y(first.qubit)}" x2="${x}" y2="${this.y(second.qubit)}"/>`];
    const condition = first.operation.classicalCondition;
    return [
      ...lines,
      ...this.renderSwapMark(step.step, first.qubit, second.qubit, x),
      ...this.renderSwapMark(step.step, second.qubit, first.qubit, x),
      ...(condition === undefined ? [] : [this.text(x + 10, this.y(first.qubit) - 11, `<${condition}`, undefined, 'annotation')]),
      ...step.measurements.flatMap((placement) => this.renderMeasurement(step.step, placement, x))
    ];
  }

  private renderSwapMark(step: number, qubit: number, pairQubit: number, x: number): string[] {
    const y = this.y(qubit);
    return [
      `<g data-operation="swap" data-step="${step}" data-qubit="${qubit}" data-pair-qubit="${pairQubit}">`,
      `<path class="swap-mark" d="M ${x - 6} ${y - 6} L ${x + 6} ${y + 6} M ${x + 6} ${y - 6} L ${x - 6} ${y + 6}"/>`,
      '</g>'
    ];
  }

  private renderTarget(step: number, placement: Placement, x: number): string[] {
    const y = this.y(placement.qubit);
    const condition = placement.operation.classicalCondition;
    return [
      `<g data-operation="cnot-target" data-step="${step}" data-qubit="${placement.qubit}">`,
      `<circle class="target-mark" cx="${x}" cy="${y}" r="11"/>`,
      `<path class="target-mark" d="M ${x - 8} ${y} H ${x + 8} M ${x} ${y - 8} V ${y + 8}"/>`,
      ...(condition === undefined ? [] : [this.text(x + 13, y - 11, `<${condition}`, undefined, 'annotation')]),
      '</g>'
    ];
  }

  private text(x: number, y: number, value: string, style?: string, className?: string): string {
    const classAttribute = className === undefined ? '' : ` class="${className}"`;
    const styleAttribute = style === undefined ? '' : ` style="${style}"`;
    return `<text${classAttribute}${styleAttribute} x="${x}" y="${y}" text-anchor="middle">${escapeXml(value)}</text>`;
  }

  private get topCaption(): string[] {
    return this.caption !== '' && this.captionPosition === 'top'
      ? [this.captionText('top', MARGIN + this.captionSize)]
      : [];
  }

  private get wires(): string[] {
    const wireStart = LABEL_WIDTH;
    const wireEnd = this.width - MARGIN;
    return Array.from({ length: this.circuit.qubits }, (_unused, qubit) => {
      const y = this.y(qubit);
      return [
        `<text class="label" data-operation="wire-label" data-qubit="${qubit}" x="${MARGIN}" y="${y + 5}">q${qubit}</text>`,
        `<line class="wire" data-operation="wire" data-qubit="${qubit}" x1="${wireStart}" y1="${y}" x2="${wireEnd}" y2="${y}"/>`
      ];
    }).flat();
  }

  private y(qubit: number): number {
    return ROW_HEIGHT / 2 + qubit * ROW_HEIGHT + (this.caption !== '' && this.captionPosition === 'top' ? this.captionSpace : 0);
  }
}

function columnLayout(steps: readonly SvgStep[]): { readonly centers: number[]; readonly width: number } {
  if (steps.length === 0) {
    return { centers: [], width: 192 };
  }

  let cursor = LABEL_WIDTH + MARGIN;
  const centers = steps.map((step) => {
    const center = cursor + step.width / 2;
    cursor += step.width;
    return center;
  });
  return { centers, width: cursor + MARGIN };
}

function displayLabel(operation: ParsedCircuitOperation): string {
  if (operation.kind === 'measurement') {
    return operation.measurementName === undefined ? operation.symbol : `${operation.symbol}>${operation.measurementName}`;
  }

  const symbol = operation.symbol === 'X^½' ? '√X' : operation.symbol;
  return operation.classicalCondition === undefined ? symbol : `${symbol}<${operation.classicalCondition}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function nearestSwapQubit(control: number, first: number, second: number): number {
  return Math.abs(first - control) <= Math.abs(second - control) ? first : second;
}

function operationAt(slot: unknown): ParsedCircuitOperation | undefined {
  return slot === null || slot === '' || slot === EMPTY_SLOT || slot === CONTROL_SYMBOL
    ? undefined
    : parseCircuitOperationSlot(slot);
}
