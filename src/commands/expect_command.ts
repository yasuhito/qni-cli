import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { Simulator } from '../simulator';

const HELP_TEXT = `Usage:
  qni expect PAULI_STRING [PAULI_STRING...] [--latex]

Overview:
  Calculate expectation values from ./circuit.json.
  qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
  Each PAULI_STRING must use only I, X, Y, and Z.
  The length of each PAULI_STRING must match the circuit qubit count.
  Output is one line per observable in the form PAULI_STRING=value.
  --latex prints each observable in LaTeX expectation-value notation.

Options:
  [--latex]  # Print expectation values as LaTeX

Examples:
  qni expect Z
  qni expect ZZ XX
  qni expect ZZ XX --latex
  qni expect ZZI IZZ XXX`;

export function runExpectCommand(argv: string[], context: CommandHandlerContext): number {
  if (argv.length === 1 || (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h'))) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    const latex = argv.includes('--latex');
    const pauliStrings = argv
      .slice(1)
      .filter((argument) => argument !== '--latex')
      .map((pauliString) => pauliString.toUpperCase());
    const simulator = new Simulator(currentCircuitFile(context.cwd).load());
    const output = latex
      ? simulator.renderExpectationValuesLatex(pauliStrings)
      : simulator.renderExpectationValues(pauliStrings);
    process.stdout.write(`${output}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
