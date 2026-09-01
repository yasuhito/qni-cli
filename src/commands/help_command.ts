import type { CommandHandlerContext } from '../dispatcher';

const HELP_TEXT = `qni commands:
  qni add       # Add a gate to the circuit
  qni bloch     # Render the current 1-qubit state on the Bloch sphere
  qni clear     # Delete the current circuit file
  qni expect    # Show expectation values of Pauli strings
  qni export    # Export the circuit as SVG, qcircuit LaTeX, or PNG
  qni gate      # Show the gate at a circuit slot
  qni rm        # Remove a gate from the circuit
  qni run       # Show the state vector of the circuit
  qni state     # Manage the initial state vector
  qni variable  # Manage symbolic angle variables
  qni view      # Render the circuit as ASCII art`;

export function runHelpCommand(argv: string[], _context: CommandHandlerContext): number {
  if (argv.length === 0 || (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h'))) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  if (argv[0] === 'help') {
    process.stderr.write('qni help is not available; use qni or qni COMMAND --help\n');
    return 1;
  }

  process.stderr.write(`Could not find command "${argv[0] ?? ''}".\n`);
  return 1;
}
