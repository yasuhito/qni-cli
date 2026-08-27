import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import {
  formatMeasurementDistribution,
  sampleMeasurementDistribution
} from '../measurement_distribution';
import { circuitContainsMeasurements, Simulator } from '../simulator';
import { renderSymbolicStateVector } from '../symbolic_state_renderer';
import { thorArgumentsError } from './thor_compatibility';

const MAX_SEED = 0xffffffff;

const HELP_TEXT = `Usage:
  qni run [--symbolic] [--basis=BASIS]
  qni run [--shots N] [--seed N] [--json]

Overview:
  Simulate ./circuit.json and print the resulting state vector.
  Without --symbolic, output is numeric amplitudes in the computational basis.
  A circuit containing Measure is run once and prints qN=0 or qN=1 for each measured qubit.
  Use --shots to run a measurement circuit independently from its initial state and print a joint distribution.
  Use --seed to reproduce the same joint distribution. Without it, measurement uses ordinary unfixed randomness.
  Use --json to return shots, seed, classical bit names, values, and counts as structured data.
  Measurement follows computational-basis probabilities and collapses the state before later operations.
  --symbolic prints a symbolic ket expression for supported small circuits.
  --basis currently works only with --symbolic and supports x or y for 1-qubit output, and bell for 2-qubit output.

Options:
  [--symbolic]       # Show a 1-qubit symbolic state expression
  [--basis=BASIS]    # Show a symbolic state in a named basis such as x, y, or bell
  [--shots N]        # Run a measurement circuit N independent times
  [--seed N]         # Use an unsigned 32-bit seed for reproducible measurement
  [--json]           # Print a machine-readable measurement distribution

Examples:
  qni run
  qni run --symbolic
  qni run --symbolic --basis x
  qni run --symbolic --basis y
  qni run --symbolic --basis bell
  qni run --shots 100
  qni run --shots 100 --seed 42
  qni run --shots 100 --seed 42 --json`;

interface RunOptions {
  basis?: string;
  json: boolean;
  seed?: number;
  shots: number;
  shotsSpecified: boolean;
  symbolic: boolean;
}

export function runRunCommand(argv: string[], context: CommandHandlerContext): number {
  if (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h')) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    const options = parseRunOptions(argv);
    const circuit = currentCircuitFile(context.cwd).load();
    if (options.basis !== undefined && !options.symbolic) {
      throw new Error('--basis requires --symbolic');
    }

    const containsMeasurements = circuitContainsMeasurements(circuit);
    const distributionRequested = options.shotsSpecified || options.seed !== undefined || options.json;

    if (containsMeasurements && options.symbolic) {
      throw new Error('--symbolic cannot be used with a circuit containing measurements');
    }
    if (!containsMeasurements && distributionRequested) {
      throw new Error('--shots, --seed, and --json require a circuit containing measurements');
    }

    const output = containsMeasurements
      ? distributionRequested
        ? renderDistribution(circuit, options)
        : new Simulator(circuit)
            .runMeasurements()
            .map(({ name, qubit, value }) => `${name ?? `q${qubit}`}=${value}`)
            .join('\n')
      : options.symbolic
        ? renderSymbolicStateVector({
            basis: options.basis,
            circuit,
            env: context.env,
            projectRoot: context.projectRoot
          })
        : new Simulator(circuit).renderStateVector();

    process.stdout.write(`${output}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function renderDistribution(circuit: Parameters<typeof sampleMeasurementDistribution>[0], options: RunOptions): string {
  const distribution = sampleMeasurementDistribution(circuit, options.shots, options.seed);
  return options.json ? JSON.stringify(distribution, null, 2) : formatMeasurementDistribution(distribution);
}

function parseRunOptions(argv: readonly string[]): RunOptions {
  const options: RunOptions = { json: false, shots: 1, shotsSpecified: false, symbolic: false };
  let index = 1;

  while (index < argv.length) {
    const argument = argv[index];

    if (argument === '--symbolic') {
      options.symbolic = true;
      index += 1;
      continue;
    }
    if (argument === '--json') {
      options.json = true;
      index += 1;
      continue;
    }
    if (argument === '--basis' || argument === '--shots' || argument === '--seed') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('-')) {
        if (argument === '--basis') {
          options.basis = 'basis';
          index += 1;
          continue;
        }
        setNumericOption(options, argument, value);
      }
      if (argument === '--basis') {
        options.basis = value;
      } else {
        setNumericOption(options, argument, value);
      }
      index += 2;
      continue;
    }
    if (argument.startsWith('--basis=')) {
      options.basis = argument.slice('--basis='.length);
      index += 1;
      continue;
    }
    if (argument.startsWith('--shots=')) {
      setNumericOption(options, '--shots', argument.slice('--shots='.length));
      index += 1;
      continue;
    }
    if (argument.startsWith('--seed=')) {
      setNumericOption(options, '--seed', argument.slice('--seed='.length));
      index += 1;
      continue;
    }

    throw new Error(thorArgumentsError('qni simulate', [argument], 'qni run'));
  }

  return options;
}

function setNumericOption(
  options: { seed?: number; shots: number; shotsSpecified: boolean },
  option: '--seed' | '--shots',
  rawValue: string | undefined
): void {
  const value = rawValue === undefined || rawValue.trim() === '' ? Number.NaN : Number(rawValue);

  if (option === '--shots') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('--shots must be a positive integer');
    }
    options.shots = value;
    options.shotsSpecified = true;
    return;
  }

  if (!Number.isInteger(value) || value < 0 || value > MAX_SEED) {
    throw new Error(`--seed must be an integer between 0 and ${MAX_SEED}`);
  }
  options.seed = value;
}
