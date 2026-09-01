import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

const TEMP_DIR_OPTIONS = { prefix: 'qni-cli-help-' };

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
  qni view      # Render the circuit as ASCII art
`;

describe('top-level help TypeScript route', () => {
  it('prints the command list through the TypeScript route', async () => {
    await withTempDir(
      async (dir) => {
        const result = captureDispatcherRun(dir, []);

        assert.equal(result.exitStatus, 0);
        assert.equal(result.stdout, HELP_TEXT);
        assert.equal(result.stderr, '');
      },
      TEMP_DIR_OPTIONS
    );
  });

  it('prints the command list for --help through the TypeScript route', async () => {
    await withTempDir(
      async (dir) => {
        const result = captureDispatcherRun(dir, ['--help']);

        assert.equal(result.exitStatus, 0);
        assert.equal(result.stdout, HELP_TEXT);
        assert.equal(result.stderr, '');
      },
      TEMP_DIR_OPTIONS
    );
  });

  it('rejects qni help subcommands like the Ruby command', async () => {
    await withTempDir(
      async (dir) => {
        const result = captureDispatcherRun(dir, ['help', 'add']);

        assert.equal(result.exitStatus, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'qni help is not available; use qni or qni COMMAND --help\n');
      },
      TEMP_DIR_OPTIONS
    );
  });

  it('rejects unknown commands through the TypeScript route', async () => {
    await withTempDir(
      async (dir) => {
        const result = captureDispatcherRun(dir, ['__missing_command__'], { PATH: '' });

        assert.equal(result.exitStatus, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'Could not find command "__missing_command__".\n');
      },
      TEMP_DIR_OPTIONS
    );
  });
});
