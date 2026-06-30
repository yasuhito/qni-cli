import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

const HELP_TEXT = `Usage:
  qni clear

Overview:
  Delete ./circuit.json.
  If ./circuit.json does not exist, qni clear still succeeds.
  Standard output is empty on success.

Examples:
  qni clear
`;

async function circuitExists(dir: string): Promise<boolean> {
  try {
    await access(path.join(dir, 'circuit.json'), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe('clear command TypeScript route', () => {
  it('deletes circuit.json through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const circuitPath = path.join(dir, 'circuit.json');
      await writeFile(circuitPath, '{"qubits":1,"cols":[["H"]]}\n');

      const result = captureDispatcherRun(dir, ['clear']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(await circuitExists(dir), false);
    });
  });

  it('succeeds without creating circuit.json when it does not exist', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(await circuitExists(dir), false);
    });
  });

  it('prints clear help through the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear', '--help']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, HELP_TEXT);
      assert.equal(result.stderr, '');
    });
  });

  it('rejects extra arguments like the Ruby command', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['clear', '--bad', 'foo']);

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.equal(
        result.stderr,
        'ERROR: "qni clear" was called with arguments ["--bad", "foo"]\nUsage: "qni clear"\n'
      );
    });
  });
});
