import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { Simulator } from '../simulator';
import { renderSymbolicStateVector } from '../symbolic_state_renderer';
import { thorArgumentsError } from './thor_compatibility';

const HELP_TEXT = `Usage:
  qni run [--symbolic] [--basis=BASIS]

Overview:
  Simulate ./circuit.json and print the resulting state vector.
  Without --symbolic, output is numeric amplitudes in the computational basis.
  --symbolic prints a symbolic ket expression for supported small circuits.
  --basis currently works only with --symbolic and supports x or y for 1-qubit output, and bell for 2-qubit output.

Options:
  [--symbolic]       # Show a 1-qubit symbolic state expression
  [--basis=BASIS]    # Show a symbolic state in a named basis such as x, y, or bell

Examples:
  qni run
  qni run --symbolic
  qni run --symbolic --basis x
  qni run --symbolic --basis y
  qni run --symbolic --basis bell`;

interface RunOptions {
  readonly basis?: string;
  readonly symbolic: boolean;
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

    const output = options.symbolic
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

function parseRunOptions(argv: readonly string[]): RunOptions {
  const options: { basis?: string; symbolic: boolean } = { symbolic: false };
  let index = 1;

  while (index < argv.length) {
    const argument = argv[index];

    if (argument === '--symbolic') {
      options.symbolic = true;
      index += 1;
      continue;
    }

    if (argument === '--basis') {
      const basis = argv[index + 1];
      if (basis === undefined || basis.startsWith('-')) {
        options.basis = 'basis';
        index += 1;
        continue;
      }

      options.basis = basis;
      index += 2;
      continue;
    }

    if (argument.startsWith('--basis=')) {
      options.basis = argument.slice('--basis='.length);
      index += 1;
      continue;
    }

    throw new Error(thorArgumentsError('qni simulate', [argument], 'qni run'));
  }

  return options;
}
