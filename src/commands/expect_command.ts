import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { generateSeed, seededRandom, validateSeed } from '../random_seed';
import { sameAxisCorrelationPauliStrings } from '../same_axis_correlations';
import { Simulator, validateNumericQubitCount } from '../simulator';

const HELP_TEXT = `Usage:
  qni expect PAULI_STRING [PAULI_STRING...] [--same-axis-correlations K] [--shots N] [--seed N] [--threshold N] [--json]
  qni expect PAULI_STRING [PAULI_STRING...] [--same-axis-correlations K] --latex
  qni expect --same-axis-correlations K [--shots N] [--seed N] [--threshold N] [--json]
  qni expect --same-axis-correlations K --latex

Overview:
  Calculate expectation values from ./circuit.json.
  qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
  Each PAULI_STRING must use only I, X, Y, and Z.
  Characters map left to right to q0, q1, and so on.
  For example, XI applies X to q0 and I to q1.
  The length of each PAULI_STRING must match the circuit qubit count.
  By default, output is one line per observable in the form PAULI_STRING=value.
  --same-axis-correlations lists all K-body X, Y, and Z same-axis correlations.
  It may be repeated; explicit Pauli strings are output first, followed by generated groups.
  --shots estimates expectation values from N measurements per setting.
  --seed reproduces the same finite-shot estimates. Without it, qni generates and reports a seed.
  --threshold marks values with an absolute value at or below N as unstable.
  Without --threshold, finite-shot estimates at or below two standard errors are unstable.
  --json prints numeric expectation values, signs, and finite-shot details as JSON.
  --latex prints each observable in LaTeX expectation-value notation.
  --latex cannot be used with --shots, --seed, --threshold, or --json.

Options:
  [--same-axis-correlations K]  # List every K-body same-axis correlation
  [--shots N]      # Estimate from N measurements per setting
  [--seed N]       # Use an unsigned 32-bit seed for reproducible estimates
  [--threshold N]  # Mark an absolute value at or below N as unstable (0 to 1)
  [--json]         # Print expectation values and signs as JSON
  [--latex]        # Print expectation values as LaTeX

Examples:
  qni expect Z
  qni expect ZZ XX
  qni expect ZZ XX --shots 1000 --seed 42
  qni expect ZX --shots 1000 --threshold 0.05
  qni expect ZZ XX --shots 1000 --seed 42 --json
  qni expect ZZ XX --json
  qni expect ZZ XX --latex
  qni expect ZZI IZZ XXX
  qni expect --same-axis-correlations 2
  qni expect ZZZ --same-axis-correlations=1`;

interface ExpectOptions {
  readonly json: boolean;
  readonly latex: boolean;
  readonly pauliStrings: readonly string[];
  readonly sameAxisCorrelationBodyCounts: readonly number[];
  readonly seed?: number;
  readonly shots?: number;
  readonly threshold?: number;
}

type Criterion =
  | { readonly kind: 'stderr'; readonly multiplier: 2 }
  | { readonly kind: 'threshold'; readonly value: number };

export function runExpectCommand(argv: string[], context: CommandHandlerContext): number {
  if (argv.length === 1 || (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h'))) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    const parsedOptions = parseExpectOptions(argv);
    validateOptionCombinations(parsedOptions);
    const circuit = currentCircuitFile(context.cwd).load();
    validateNumericQubitCount(circuit.qubits);
    const generatedPauliStrings = parsedOptions.sameAxisCorrelationBodyCounts.flatMap((bodyCount) =>
      sameAxisCorrelationPauliStrings(circuit.qubits, bodyCount)
    );
    const options: ExpectOptions = {
      ...parsedOptions,
      pauliStrings: [...parsedOptions.pauliStrings, ...generatedPauliStrings]
    };
    const output = renderExpectOutput(new Simulator(circuit), options);
    process.stdout.write(`${output}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function renderExpectOutput(simulator: Simulator, options: ExpectOptions): string {
  const expectations = simulator.expectationValues(options.pauliStrings);
  if (options.shots !== undefined) {
    const seed = options.seed ?? generateSeed();
    const estimation = simulator.estimateExpectationValues(
      options.pauliStrings,
      options.shots,
      seededRandom(seed)
    );
    const criterion: Criterion = options.threshold === undefined
      ? { kind: 'stderr', multiplier: 2 }
      : { kind: 'threshold', value: options.threshold };
    const results = expectations.map((expectation, index) => {
      const estimate = estimation.estimates[index];
      if (!estimate) {
        throw new Error(`missing finite-shot estimate: ${expectation.pauliString}`);
      }
      return {
        ...expectation,
        estimate: {
          value: estimate.value,
          sign: sign(estimate.value),
          stderr: estimate.stderr,
          unstable: isUnstable(estimate.value, estimate.stderr, criterion)
        }
      };
    });

    if (options.json) {
      return JSON.stringify({
        shots: options.shots,
        seed,
        criterion,
        settings: estimation.settings.map(({ axes, pauliStrings }) => ({ axes, paulis: pauliStrings })),
        expectations: results.map(({ pauliString, value, estimate }) => ({
          pauli: pauliString,
          value,
          sign: sign(value),
          estimate
        }))
      }, null, 2);
    }

    const summary = `shots=${options.shots} seed=${seed} settings=${estimation.settings.length} criterion=${formatCriterion(criterion)}`;
    const lines = results.map(({ pauliString, value, estimate }) =>
      `${pauliString}=${formatNumber(value)} estimate=${formatNumber(estimate.value)} stderr=${formatNumber(estimate.stderr)}${estimate.unstable ? ' unstable' : ''}`
    );
    return [summary, ...lines].join('\n');
  }

  if (options.threshold !== undefined) {
    const criterion: Criterion = { kind: 'threshold', value: options.threshold };
    if (options.json) {
      return JSON.stringify({
        criterion,
        expectations: expectations.map(({ pauliString, value }) => ({
          pauli: pauliString,
          value,
          sign: sign(value),
          unstable: isUnstable(value, 0, criterion)
        }))
      }, null, 2);
    }
    return [
      `criterion=${formatCriterion(criterion)}`,
      ...expectations.map(({ pauliString, value }) =>
        `${pauliString}=${formatNumber(value)}${isUnstable(value, 0, criterion) ? ' unstable' : ''}`
      )
    ].join('\n');
  }

  if (options.json) {
    return JSON.stringify({
      expectations: expectations.map(({ pauliString, value }) => ({
        pauli: pauliString,
        value,
        sign: sign(value)
      }))
    }, null, 2);
  }
  return options.latex
    ? simulator.renderExpectationValuesLatex(options.pauliStrings)
    : simulator.renderExpectationValues(options.pauliStrings);
}

function parseExpectOptions(argv: readonly string[]): ExpectOptions {
  let json = false;
  let latex = false;
  let seed: number | undefined;
  let shots: number | undefined;
  let threshold: number | undefined;
  const pauliStrings: string[] = [];
  const sameAxisCorrelationBodyCounts: number[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (argument === '--json' || argument === '--latex') {
      json ||= argument === '--json';
      latex ||= argument === '--latex';
      continue;
    }
    const correlationMatch = /^--same-axis-correlations(?:=(.*))?$/u.exec(argument);
    if (correlationMatch) {
      const inlineValue = correlationMatch[1];
      const nextArgument = argv[index + 1];
      const rawValue = inlineValue === undefined && nextArgument?.startsWith('--') !== true
        ? argv[++index]
        : inlineValue;
      if (rawValue === undefined || rawValue.trim() === '') {
        throw new Error('--same-axis-correlations requires a value');
      }
      const value = Number(rawValue);
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error('--same-axis-correlations must be a positive integer');
      }
      sameAxisCorrelationBodyCounts.push(value);
      continue;
    }
    const matched = /^(--shots|--seed|--threshold)(?:=(.*))?$/u.exec(argument);
    if (matched) {
      const option = matched[1] as '--shots' | '--seed' | '--threshold';
      const inlineValue = matched[2];
      const rawValue = inlineValue === undefined ? argv[++index] : inlineValue;
      const value = rawValue === undefined || rawValue.trim() === '' ? Number.NaN : Number(rawValue);
      if (option === '--shots') {
        if (!Number.isSafeInteger(value) || value <= 0) {
          throw new Error('--shots must be a positive integer');
        }
        shots = value;
      } else if (option === '--seed') {
        seed = validateSeed(value);
      } else {
        if (!Number.isFinite(value) || value < 0 || value > 1) {
          throw new Error('--threshold must be a number between 0 and 1');
        }
        threshold = value;
      }
      continue;
    }
    pauliStrings.push(argument.toUpperCase());
  }

  return { json, latex, pauliStrings, sameAxisCorrelationBodyCounts, seed, shots, threshold };
}

function validateOptionCombinations(options: ExpectOptions): void {
  if (options.latex && (
    options.json || options.shots !== undefined || options.seed !== undefined || options.threshold !== undefined
  )) {
    throw new Error('--latex cannot be used with --shots, --seed, --threshold, or --json');
  }
  if (options.seed !== undefined && options.shots === undefined) {
    throw new Error('--seed requires --shots');
  }
  if (options.pauliStrings.length === 0 && options.sameAxisCorrelationBodyCounts.length === 0) {
    throw new Error(options.json
      ? 'at least one Pauli string is required with --json'
      : 'at least one Pauli string is required');
  }
}

function isUnstable(value: number, stderr: number, criterion: Criterion): boolean {
  return Math.abs(value) <= (criterion.kind === 'stderr' ? criterion.multiplier * stderr : criterion.value);
}

function formatCriterion(criterion: Criterion): string {
  return criterion.kind === 'stderr' ? '2*stderr' : `threshold=${formatNumber(criterion.value)}`;
}

function sign(value: number): -1 | 0 | 1 {
  return value === 0 ? 0 : value < 0 ? -1 : 1;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}
