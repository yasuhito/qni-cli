import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { Simulator } from '../simulator';

const HELP_TEXT = `Usage:
  qni expect PAULI_STRING [PAULI_STRING...]

Overview:
  Calculate expectation values from ./circuit.json.
  qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
  Each PAULI_STRING must use only I, X, Y, and Z.
  The length of each PAULI_STRING must match the circuit qubit count.
  Output is one line per observable in the form PAULI_STRING=value.

Examples:
  qni expect Z
  qni expect ZZ XX
  qni expect ZZI IZZ XXX`;

export function runExpectCommand(argv: string[], context: CommandHandlerContext): number {
  if (argv.length === 1 || (argv.length === 2 && (argv[1] === '--help' || argv[1] === '-h'))) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  try {
    const pauliStrings = argv.slice(1).map((pauliString) => pauliString.toUpperCase());
    process.stdout.write(`${new Simulator(currentCircuitFile(context.cwd).load()).renderExpectationValues(pauliStrings)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
