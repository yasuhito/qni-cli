import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, type Dirent } from 'node:fs';
import path = require('node:path');

import type { BenchmarkStatus } from './evaluation_runner';

export interface WriteResearchPlotRequest {
  readonly benchmark: string;
  readonly cwd: string;
  readonly output: string;
}

export interface WriteResearchPlotResult {
  readonly outputPath: string;
  readonly plot: ResearchPlot;
}

export interface ResearchPlot {
  readonly benchmark: string;
  readonly exclusions: ResearchPlotExclusions;
  readonly points: readonly ResearchPlotPoint[];
}

export interface ResearchPlotExclusions {
  readonly benchmarkMismatch: number;
  readonly invalidTrial: number;
  readonly missingOrInvalidMetrics: number;
}

export interface ResearchPlotPoint {
  readonly benchmark: string;
  readonly cost: ResearchPlotCost;
  readonly id: string;
  readonly label: string;
  readonly score: ResearchPlotScore;
  readonly status: BenchmarkStatus;
  readonly tokens?: ResearchPlotTokens;
}

export interface ResearchPlotScore {
  readonly passed: number;
  readonly percent: number;
  readonly total: number;
}

export interface ResearchPlotTokens {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface ResearchPlotCost {
  readonly perProblemUsd: number;
  readonly totalUsd: number;
}

interface ResearchPlotTrialCandidate {
  readonly invalidReason: readonly string[];
  readonly metadata?: ResearchPlotMetadata;
}

interface ResearchPlotMetadata {
  readonly benchmark: string;
  readonly collaborator: string;
  readonly cost?: unknown;
  readonly createdAt: string;
  readonly id: string;
  readonly model?: unknown;
  readonly result: string;
  readonly score?: unknown;
  readonly status: BenchmarkStatus;
  readonly tokens?: unknown;
}

interface JsonObjectReadResult {
  readonly invalidReason: string[];
  readonly value?: Record<string, unknown>;
}

const RESEARCH_RUNS_DISPLAY_PATH = 'research/runs';
const RESEARCH_RUNS_PATH = path.join('research', 'runs');
const RESEARCH_TRIAL_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{6}Z)/u;
const RESEARCH_TRIAL_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const SVG_WIDTH = 860;
const SVG_HEIGHT = 520;
const PLOT_LEFT = 92;
const PLOT_TOP = 42;
const PLOT_WIDTH = 650;
const PLOT_HEIGHT = 350;
const X_TICK_COUNT = 5;
const Y_TICKS = [0, 25, 50, 75, 100] as const;

export function writeResearchPlotHtml(request: WriteResearchPlotRequest): WriteResearchPlotResult {
  const plot = buildResearchPlot({
    benchmark: request.benchmark,
    cwd: request.cwd
  });
  const outputPath = path.resolve(request.cwd, request.output);

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, formatResearchPlotHtml(plot));

  return {
    outputPath: displayOutputPath(request.output, outputPath),
    plot
  };
}

export function buildResearchPlot(options: { readonly benchmark: string; readonly cwd: string }): ResearchPlot {
  const exclusions = {
    invalidTrial: 0,
    benchmarkMismatch: 0,
    missingOrInvalidMetrics: 0
  };
  const points: ResearchPlotPoint[] = [];

  for (const candidate of readResearchPlotTrialCandidates(options.cwd)) {
    if (!candidate.metadata) {
      exclusions.invalidTrial += 1;
      continue;
    }

    if (candidate.metadata.benchmark !== options.benchmark) {
      exclusions.benchmarkMismatch += 1;
      continue;
    }

    const point = researchPlotPoint(candidate.metadata);

    if (!point) {
      exclusions.missingOrInvalidMetrics += 1;
      continue;
    }

    points.push(point);
  }

  return {
    benchmark: options.benchmark,
    exclusions,
    points
  };
}

export function formatResearchPlotHtml(plot: ResearchPlot): string {
  const xMax = xAxisMaximum(plot.points);
  const plotData = JSON.stringify(plot, null, 2).replace(/</gu, '\\u003c');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>Qni research cost per problem vs score: ${escapeHtml(plot.benchmark)}</title>`,
    '<style>',
    'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #172033; background: #ffffff; }',
    'h1 { margin-bottom: 0.25rem; }',
    'code { background: #f2f5f9; padding: 0.1rem 0.25rem; border-radius: 0.25rem; }',
    '.plot-frame { max-width: 960px; overflow-x: auto; }',
    'svg { max-width: 100%; height: auto; border: 1px solid #d8dee9; background: #fbfcfe; }',
    '.axis { stroke: #2e3440; stroke-width: 1.5; }',
    '.grid { stroke: #d8dee9; stroke-width: 1; }',
    '.tick-label, .axis-label { fill: #3b4252; font-size: 13px; }',
    '.axis-label { font-weight: 600; }',
    '.point circle { fill: #2f80ed; stroke: #174ea6; stroke-width: 1.5; }',
    '.point text { fill: #172033; font-size: 12px; font-weight: 600; paint-order: stroke; stroke: #ffffff; stroke-width: 3px; stroke-linejoin: round; }',
    'table { border-collapse: collapse; margin-top: 1rem; min-width: 860px; }',
    'th, td { border: 1px solid #d8dee9; padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; }',
    'th { background: #edf2f7; }',
    '</style>',
    '</head>',
    '<body>',
    '<h1>Qni research cost per problem vs score</h1>',
    `<p>Benchmark: <code>${escapeHtml(plot.benchmark)}</code></p>`,
    '<section class="plot-frame" aria-labelledby="scatter-title">',
    '<h2 id="scatter-title">Scatter plot</h2>',
    plot.points.length === 0 ? '<p>No plottable research trials found.</p>' : '',
    '<svg role="img" aria-labelledby="plot-title plot-desc" viewBox="0 0 860 520">',
    `<title id="plot-title">Cost per problem vs score for ${escapeHtml(plot.benchmark)}</title>`,
    '<desc id="plot-desc">x axis is cost per problem in USD on a linear scale; y axis is score percent on a linear scale from 0 to 100.</desc>',
    ...xGridLines(xMax),
    ...yGridLines(),
    `<line class="axis" x1="${PLOT_LEFT}" y1="${PLOT_TOP + PLOT_HEIGHT}" x2="${PLOT_LEFT + PLOT_WIDTH}" y2="${PLOT_TOP + PLOT_HEIGHT}"></line>`,
    `<line class="axis" x1="${PLOT_LEFT}" y1="${PLOT_TOP}" x2="${PLOT_LEFT}" y2="${PLOT_TOP + PLOT_HEIGHT}"></line>`,
    ...xTickLabels(xMax),
    ...yTickLabels(),
    `<text class="axis-label" x="${PLOT_LEFT + PLOT_WIDTH / 2}" y="${PLOT_TOP + PLOT_HEIGHT + 74}" text-anchor="middle">Cost per problem (USD, linear)</text>`,
    `<text class="axis-label" transform="translate(24 ${PLOT_TOP + PLOT_HEIGHT / 2}) rotate(-90)" text-anchor="middle">Score percent (linear)</text>`,
    ...plot.points.map((point, index) => svgPoint(point, index, xMax)),
    '</svg>',
    '</section>',
    '<section id="exclusions" aria-labelledby="exclusions-title">',
    '<h2 id="exclusions-title">Excluded trials</h2>',
    '<ul>',
    `<li>invalid trial: ${plot.exclusions.invalidTrial}</li>`,
    `<li>benchmark mismatch: ${plot.exclusions.benchmarkMismatch}</li>`,
    `<li>missing or invalid metrics: ${plot.exclusions.missingOrInvalidMetrics}</li>`,
    '</ul>',
    '</section>',
    '<section aria-labelledby="details-title">',
    '<h2 id="details-title">Trial details</h2>',
    '<table>',
    '<thead>',
    '<tr><th>Label</th><th>Trial id</th><th>Benchmark</th><th>Status</th><th>Passed/total</th><th>Tokens</th><th>Total cost</th><th>Cost per problem</th><th>Score</th></tr>',
    '</thead>',
    '<tbody>',
    ...plot.points.flatMap((point) => tableRow(point)),
    '</tbody>',
    '</table>',
    '</section>',
    '<script type="application/json" id="qni-research-plot-data">',
    plotData,
    '</script>',
    '</body>',
    '</html>',
    ''
  ].filter((line) => line !== '').join('\n');
}

function readResearchPlotTrialCandidates(cwd: string): ResearchPlotTrialCandidate[] {
  const runsDir = path.join(cwd, RESEARCH_RUNS_PATH);
  let entries: Dirent[];
  let runsDirStats: ReturnType<typeof statSync>;

  try {
    runsDirStats = statSync(runsDir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  if (!runsDirStats.isDirectory()) {
    throw new Error(`Research runs path is not a directory: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  try {
    entries = readdirSync(runsDir, { withFileTypes: true });
  } catch {
    throw new Error(`Research runs path could not be read: ${RESEARCH_RUNS_DISPLAY_PATH}`);
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => readResearchPlotTrial(path.join(runsDir, entry.name), entry.name))
    .sort(compareResearchPlotTrialCandidates);
}

function readResearchPlotTrial(trialDir: string, id: string): ResearchPlotTrialCandidate {
  const invalidReason = invalidReasonsForTrialId(id);
  const metadataFile = readJsonObject(path.join(trialDir, 'metadata.json'), 'metadata.json');

  invalidReason.push(...metadataFile.invalidReason);

  const metadata = metadataFile.value ? researchPlotMetadata(metadataFile.value, invalidReason) : undefined;

  if (metadata && metadata.id !== id) {
    invalidReason.push(`metadata id ${metadata.id} does not match research trial id ${id}`);
  }

  if (metadata && metadata.result !== 'result.json') {
    invalidReason.push(`metadata result ${metadata.result} does not point to result.json`);
  }

  if (!metadata || invalidReason.length > 0) {
    return { invalidReason };
  }

  return {
    invalidReason: [],
    metadata
  };
}

function readJsonObject(filePath: string, displayName: string): JsonObjectReadResult {
  if (!existsSync(filePath)) {
    return { invalidReason: [`${displayName} is missing`] };
  }

  let contents: string;

  try {
    contents = readFileSync(filePath, 'utf8');
  } catch {
    return { invalidReason: [`${displayName} could not be read`] };
  }

  let value: unknown;

  try {
    value = JSON.parse(contents) as unknown;
  } catch {
    return { invalidReason: [`${displayName} is not valid JSON`] };
  }

  if (!isRecord(value)) {
    return { invalidReason: [`${displayName} must be a JSON object`] };
  }

  return {
    invalidReason: [],
    value
  };
}

function researchPlotMetadata(
  value: Record<string, unknown>,
  invalidReason: string[]
): ResearchPlotMetadata | undefined {
  if (value.schemaVersion !== 1) {
    invalidReason.push(`unsupported metadata schemaVersion: ${String(value.schemaVersion)}`);
    return undefined;
  }

  const id = requiredString(value, 'id', 'metadata.json', invalidReason);
  const createdAt = requiredString(value, 'createdAt', 'metadata.json', invalidReason);
  const collaborator = requiredString(value, 'collaborator', 'metadata.json', invalidReason);
  const benchmark = requiredString(value, 'benchmark', 'metadata.json', invalidReason);
  const result = requiredString(value, 'result', 'metadata.json', invalidReason);
  const status = requiredBenchmarkStatus(value.status, 'metadata.json status', invalidReason);

  if (!id || !createdAt || !collaborator || !benchmark || !result || !status) {
    return undefined;
  }

  return {
    id,
    createdAt,
    collaborator,
    benchmark,
    result,
    status,
    score: value.score,
    cost: value.cost,
    tokens: value.tokens,
    model: value.model
  };
}

function researchPlotPoint(metadata: ResearchPlotMetadata): ResearchPlotPoint | undefined {
  const score = researchPlotScore(metadata.score);
  const cost = researchPlotCost(metadata.cost);

  if (!score || !cost) {
    return undefined;
  }

  return {
    id: metadata.id,
    benchmark: metadata.benchmark,
    status: metadata.status,
    label: researchPlotLabel(metadata),
    score,
    cost,
    tokens: researchPlotTokens(metadata.tokens)
  };
}

function researchPlotScore(value: unknown): ResearchPlotScore | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const passed = nonnegativeInteger(value.passed);
  const total = nonnegativeInteger(value.total);
  const percent = finiteNumber(value.percent);

  if (
    passed === undefined ||
    total === undefined ||
    percent === undefined ||
    total <= 0 ||
    passed > total ||
    percent < 0 ||
    percent > 100
  ) {
    return undefined;
  }

  return {
    passed,
    total,
    percent
  };
}

function researchPlotCost(value: unknown): ResearchPlotCost | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const perProblemUsd = finiteNumber(value.perProblemUsd);
  const totalUsd = finiteNumber(value.totalUsd);

  if (
    perProblemUsd === undefined ||
    totalUsd === undefined ||
    perProblemUsd < 0 ||
    totalUsd < 0
  ) {
    return undefined;
  }

  return {
    perProblemUsd,
    totalUsd
  };
}

function researchPlotTokens(value: unknown): ResearchPlotTokens | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const inputTokens = optionalNonnegativeInteger(value.inputTokens);
  const outputTokens = optionalNonnegativeInteger(value.outputTokens);
  const totalTokens = optionalNonnegativeInteger(value.totalTokens);

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }

  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens })
  };
}

function researchPlotLabel(metadata: ResearchPlotMetadata): string {
  if (isRecord(metadata.model)) {
    const registryId = metadata.model.registryId;

    if (typeof registryId === 'string' && registryId.length > 0) {
      return registryId;
    }
  }

  return metadata.collaborator;
}

function xAxisMaximum(points: readonly ResearchPlotPoint[]): number {
  const maximum = Math.max(0, ...points.map((point) => point.cost.perProblemUsd));

  return maximum > 0 ? maximum : 1;
}

function xCoordinate(value: number, xMax: number): number {
  return PLOT_LEFT + (value / xMax) * PLOT_WIDTH;
}

function yCoordinate(scorePercent: number): number {
  return PLOT_TOP + ((100 - scorePercent) / 100) * PLOT_HEIGHT;
}

function xGridLines(xMax: number): string[] {
  const bottom = PLOT_TOP + PLOT_HEIGHT;

  return Array.from({ length: X_TICK_COUNT + 1 }, (_, index) => {
    const value = (xMax * index) / X_TICK_COUNT;
    const x = xCoordinate(value, xMax);

    return `<line class="grid" x1="${formatSvgNumber(x)}" y1="${PLOT_TOP}" x2="${formatSvgNumber(x)}" y2="${bottom}"></line>`;
  });
}

function yGridLines(): string[] {
  return Y_TICKS.map((value) => {
    const y = yCoordinate(value);

    return `<line class="grid" x1="${PLOT_LEFT}" y1="${formatSvgNumber(y)}" x2="${PLOT_LEFT + PLOT_WIDTH}" y2="${formatSvgNumber(y)}"></line>`;
  });
}

function xTickLabels(xMax: number): string[] {
  const y = PLOT_TOP + PLOT_HEIGHT + 24;

  return Array.from({ length: X_TICK_COUNT + 1 }, (_, index) => {
    const value = (xMax * index) / X_TICK_COUNT;
    const x = xCoordinate(value, xMax);

    return `<text class="tick-label" x="${formatSvgNumber(x)}" y="${y}" text-anchor="middle">${escapeHtml(formatUsd(value))}</text>`;
  });
}

function yTickLabels(): string[] {
  return Y_TICKS.map((value) => {
    const y = yCoordinate(value);

    return `<text class="tick-label" x="${PLOT_LEFT - 14}" y="${formatSvgNumber(y + 4)}" text-anchor="end">${value}%</text>`;
  });
}

function svgPoint(point: ResearchPlotPoint, index: number, xMax: number): string {
  const x = xCoordinate(point.cost.perProblemUsd, xMax);
  const y = yCoordinate(point.score.percent);
  const labelOffset = 14 + (index % 3) * 12;

  return [
    `<g class="point" data-trial-id="${escapeAttribute(point.id)}">`,
    `<title>${escapeHtml(point.label)}: ${escapeHtml(point.id)}, score ${formatPercent(point.score.percent)}, cost per problem ${formatUsd(point.cost.perProblemUsd)}</title>`,
    `<circle cx="${formatSvgNumber(x)}" cy="${formatSvgNumber(y)}" r="5"></circle>`,
    `<text x="${formatSvgNumber(x)}" y="${formatSvgNumber(Math.max(16, y - labelOffset))}" text-anchor="middle">${escapeHtml(point.label)}</text>`,
    '</g>'
  ].join('\n');
}

function tableRow(point: ResearchPlotPoint): string[] {
  return [
    `<tr data-trial-id="${escapeAttribute(point.id)}">`,
    `<td>${escapeHtml(point.label)}</td>`,
    `<td><code>${escapeHtml(point.id)}</code></td>`,
    `<td><code>${escapeHtml(point.benchmark)}</code></td>`,
    `<td>${point.status}</td>`,
    `<td>${point.score.passed}/${point.score.total}</td>`,
    `<td>${escapeHtml(formatTokens(point.tokens))}</td>`,
    `<td>${formatUsd(point.cost.totalUsd)}</td>`,
    `<td>${formatUsd(point.cost.perProblemUsd)}</td>`,
    `<td>${formatPercent(point.score.percent)}</td>`,
    '</tr>'
  ];
}

function formatTokens(tokens: ResearchPlotTokens | undefined): string {
  if (!tokens) {
    return 'unknown';
  }

  return [
    `input ${formatTokenCount(tokens.inputTokens)}`,
    `output ${formatTokenCount(tokens.outputTokens)}`,
    `total ${formatTokenCount(tokens.totalTokens)}`
  ].join(', ');
}

function formatTokenCount(value: number | undefined): string {
  return value === undefined ? 'unknown' : String(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  const fractionDigits = value !== 0 && Math.abs(value) < 0.01 ? 8 : 4;

  return `$${trimTrailingZeros(value.toFixed(fractionDigits))}`;
}

function formatSvgNumber(value: number): string {
  return trimTrailingZeros(value.toFixed(3));
}

function trimTrailingZeros(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function requiredString(
  value: Record<string, unknown>,
  fieldName: string,
  sourceName: string,
  invalidReason: string[]
): string | undefined {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.length === 0) {
    invalidReason.push(`${sourceName} ${fieldName} must be a non-empty string`);
    return undefined;
  }

  return fieldValue;
}

function requiredBenchmarkStatus(
  value: unknown,
  sourceName: string,
  invalidReason: string[]
): BenchmarkStatus | undefined {
  if (isBenchmarkStatus(value)) {
    return value;
  }

  invalidReason.push(`${sourceName} must be passed, failed, disallowed, or error`);
  return undefined;
}

function isBenchmarkStatus(value: unknown): value is BenchmarkStatus {
  return value === 'passed' || value === 'failed' || value === 'disallowed' || value === 'error';
}

function nonnegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function optionalNonnegativeInteger(value: unknown): number | undefined {
  return value === undefined ? undefined : nonnegativeInteger(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingPathError(error: unknown): boolean {
  return isErrnoException(error) && error.code === 'ENOENT';
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function invalidReasonsForTrialId(id: string): string[] {
  return RESEARCH_TRIAL_ID_PATTERN.test(id) ? [] : [`invalid research trial id: ${id}`];
}

function compareResearchPlotTrialCandidates(left: ResearchPlotTrialCandidate, right: ResearchPlotTrialCandidate): number {
  const leftId = left.metadata?.id ?? '';
  const rightId = right.metadata?.id ?? '';
  const timestampOrder = timestampPart(rightId).localeCompare(timestampPart(leftId));

  return timestampOrder === 0 ? leftId.localeCompare(rightId) : timestampOrder;
}

function timestampPart(id: string): string {
  return RESEARCH_TRIAL_TIMESTAMP_PATTERN.exec(id)?.[1] ?? '';
}

function displayOutputPath(output: string, outputPath: string): string {
  return path.isAbsolute(output) ? outputPath : toPosixPath(output);
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/gu, '&#96;');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}
