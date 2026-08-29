import { Simulator, type MeasurementResult } from './simulator';
import type { CircuitData } from './circuit_file';
import { seededRandom } from './random_seed';

export interface MeasurementDistribution {
  readonly shots: number;
  readonly seed: number;
  readonly classicalBits: readonly string[];
  readonly results: readonly MeasurementDistributionResult[];
}

export interface MeasurementDistributionResult {
  readonly values: Readonly<Record<string, 0 | 1>>;
  readonly count: number;
}

export function sampleMeasurementDistribution(
  circuit: CircuitData,
  shots: number,
  seed: number
): MeasurementDistribution {
  const random = seededRandom(seed);
  const simulator = new Simulator(circuit);
  let classicalBits: readonly string[] | undefined;
  const counts = new Map<string, { count: number; values: Record<string, 0 | 1> }>();

  for (let shot = 0; shot < shots; shot += 1) {
    const measurements = simulator.runMeasurements(random);
    const labels = measurementLabels(measurements);
    classicalBits ??= labels;

    const values = Object.fromEntries(
      measurements.map((measurement, index) => [labels[index] as string, measurement.value])
    ) as Record<string, 0 | 1>;
    const key = labels.map((label) => values[label]).join('');
    const current = counts.get(key);

    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { count: 1, values });
    }
  }

  return {
    shots,
    seed,
    classicalBits: classicalBits ?? [],
    results: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, result]) => ({ values: result.values, count: result.count }))
  };
}

export function formatMeasurementDistribution(distribution: MeasurementDistribution): string {
  const headers = [...distribution.classicalBits, 'count'];
  const rows = distribution.results.map((result) => [
    ...distribution.classicalBits.map((name) => String(result.values[name])),
    String(result.count)
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );

  const table = [headers, ...rows]
    .map((row) => row.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join(' | ').trimEnd())
    .join('\n');

  return `shots=${distribution.shots} seed=${distribution.seed}\n${table}`;
}

function measurementLabels(measurements: readonly MeasurementResult[]): readonly string[] {
  const explicitNames = new Set(measurements.flatMap((measurement) => measurement.name ?? []));
  const used = new Set<string>();

  return measurements.map((measurement) => {
    if (measurement.name !== undefined) {
      used.add(measurement.name);
      return measurement.name;
    }

    const base = `q${measurement.qubit}`;
    let label = base;
    let suffix = 2;
    while (explicitNames.has(label) || used.has(label)) {
      label = `${base}#${suffix}`;
      suffix += 1;
    }
    used.add(label);
    return label;
  });
}
