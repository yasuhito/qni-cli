import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { Simulator } from '../../src/simulator';
import type { CircuitData } from '../../src/circuit_file';

async function withCircuit<T>(circuit: CircuitData, callback: (dir: string) => T): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-runtime-'));

  try {
    await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
    return callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function rubyOutput(dir: string, command: readonly string[]): string {
  const projectRoot = process.cwd();
  const result = spawnSync('bundle', ['exec', path.join(projectRoot, 'bin', 'qni'), ...command], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      BUNDLE_GEMFILE: path.join(projectRoot, 'Gemfile')
    },
    timeout: 30_000
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null, `Ruby oracle terminated with signal ${result.signal}`);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

describe('TypeScript numeric simulator compatibility', () => {
  it('matches Ruby oracle for numeric Bell state run and expectations', async () => {
    const circuit: CircuitData = {
      cols: [['H', 1], ['•', 'X']],
      qubits: 2
    };

    await withCircuit(circuit, (dir) => {
      const simulator = new Simulator(circuit);

      assert.equal(simulator.renderStateVector(), rubyOutput(dir, ['run']));
      assert.equal(simulator.renderExpectationValues(['ZZ', 'XX']), rubyOutput(dir, ['expect', 'ZZ', 'XX']));
    });
  });

  it('matches Ruby oracle for variables, initial_state, and angled gates', async () => {
    const circuit: CircuitData = {
      cols: [['X'], ['Ry(2*theta)']],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [
          { basis: '0', coefficient: 'alpha' },
          { basis: '1', coefficient: 'beta' }
        ]
      },
      qubits: 1,
      variables: {
        alpha: '0.6',
        beta: '0.8',
        theta: 'π/4'
      }
    };

    await withCircuit(circuit, (dir) => {
      const simulator = new Simulator(circuit);

      assert.equal(simulator.renderStateVector(), rubyOutput(dir, ['run']));
      assert.equal(simulator.renderExpectationValues(['X', 'Z']), rubyOutput(dir, ['expect', 'X', 'Z']));
    });
  });

  it('extends a shorter initial_state with zeroed suffix qubits', () => {
    const circuit: CircuitData = {
      cols: [[1, 'X']],
      initial_state: {
        format: 'ket_sum_v1',
        terms: [
          { basis: '0', coefficient: '0.7071067811865476' },
          { basis: '1', coefficient: '0.7071067811865476' }
        ]
      },
      qubits: 2
    };

    const simulator = new Simulator(circuit);

    assert.equal(simulator.renderStateVector(), '0.0,0.7071067811865476,0.0,0.7071067811865476');
    assert.equal(simulator.renderExpectationValues(['IZ']), 'IZ=-1.0');
  });

  it('rejects qubit counts that would overflow JavaScript bitwise state indexing', () => {
    const circuit: CircuitData = {
      cols: [],
      qubits: 32
    };

    assert.throws(
      () => new Simulator(circuit).renderStateVector(),
      /too many qubits for TypeScript numeric run: 32/u
    );
  });
});
