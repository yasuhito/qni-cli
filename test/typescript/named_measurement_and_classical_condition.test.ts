import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

async function circuitIn(dir: string): Promise<{ cols: unknown[][]; qubits: number }> {
  return JSON.parse(await readFile(path.join(dir, 'circuit.json'), 'utf8')) as {
    cols: unknown[][];
    qubits: number;
  };
}

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

describe('named measurements and classically conditioned gates', () => {
  it('stores named measurements and conditions in Qni-compatible slots', async () => {
    await withTempDir(async (dir) => {
      assert.equal(
        captureDispatcherRun(dir, ['add', 'Measure', '--name', 'input_bit', '--qubit', '0', '--step', '0'])
          .exitStatus,
        0
      );
      assert.equal(
        captureDispatcherRun(dir, ['add', 'Rz', '--angle', 'pi/2', '--if', 'input_bit', '--qubit', '0', '--step', '1'])
          .exitStatus,
        0
      );
      assert.deepEqual(await circuitIn(dir), {
        qubits: 1,
        cols: [['Measure>input_bit'], ['Rz(π/2)<input_bit']]
      });
    });
  });

  it('accepts the same --if option for every supported quantum gate', async () => {
    await withTempDir(async (dir) => {
      const gates = ['H', 'X', 'Y', 'Z', 'S', 'S†', 'T', 'T†', '√X'] as const;

      for (const [step, gate] of gates.entries()) {
        assert.equal(
          captureDispatcherRun(dir, ['add', gate, '--if', 'bit', '--qubit', '0', '--step', String(step)]).exitStatus,
          0,
          gate
        );
      }

      for (const [offset, gate] of ['P', 'Rx', 'Ry', 'Rz', 'GlobalPhase'].entries()) {
        assert.equal(
          captureDispatcherRun(dir, [
            'add',
            gate,
            '--angle',
            'pi/2',
            '--if',
            'bit',
            '--qubit',
            '0',
            '--step',
            String(gates.length + offset)
          ]).exitStatus,
          0,
          gate
        );
      }

      const swapStep = gates.length + 5;
      assert.equal(
        captureDispatcherRun(dir, [
          'add',
          'SWAP',
          '--if',
          'bit',
          '--qubit',
          '0,1',
          '--step',
          String(swapStep)
        ]).exitStatus,
        0
      );

      assert.deepEqual((await circuitIn(dir)).cols, [
        ...gates.map((gate) => [`${gate === '√X' ? 'X^½' : gate}<bit`, 1]),
        ...['P', 'Rx', 'Ry', 'Rz', 'GlobalPhase'].map((gate) => [`${gate}(π/2)<bit`, 1]),
        ['Swap<bit', 'Swap<bit']
      ]);
    });
  });

  it('applies a conditioned gate for one and skips it for zero in step order', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [
          ['X', 1],
          ['Measure>one', 'Measure>zero'],
          ['X<one', 'X<zero'],
          ['Measure', 'Measure']
        ]
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run']), {
        exitStatus: 0,
        stderr: '',
        stdout: 'one=1\nzero=0\nq0=0\nq1=0\n'
      });
    });
  });

  it('runs a classically conditioned controlled gate and SWAP', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [
          ['X', 1, 1],
          ['Measure>go', 1, 1],
          ['•', 'X<go', 1],
          [1, 'Swap<go', 'Swap<go'],
          [1, 'Measure', 'Measure']
        ]
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run']), {
        exitStatus: 0,
        stderr: '',
        stdout: 'go=1\nq1=0\nq2=1\n'
      });
    });
  });

  it('reports undefined, forward, and unnamed measurement references with their step', async () => {
    await withTempDir(async (dir) => {
      for (const [cols, message] of [
        [[['X<missing']], 'undefined classical bit "missing" referenced at step 0\n'],
        [[['X<later'], ['Measure>later']], 'undefined classical bit "later" referenced at step 0\n'],
        [[['Measure'], ['X<q0']], 'undefined classical bit "q0" referenced at step 1\n']
      ] as const) {
        await writeCircuit(dir, { qubits: 1, cols });
        assert.deepEqual(captureDispatcherRun(dir, ['run']), {
          exitStatus: 1,
          stderr: message,
          stdout: ''
        });
      }
    });
  });

  it('rejects duplicate named measurements without overwriting the first value', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['Measure>result'], ['Measure>result']]
      });

      assert.deepEqual(captureDispatcherRun(dir, ['run']), {
        exitStatus: 1,
        stderr: 'classical bit "result" is measured more than once at step 1\n',
        stdout: ''
      });
    });
  });

  it('renders names and conditions in text and LaTeX circuit diagrams', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['Measure>input'], ['Rz(π/2)<input']]
      });

      const view = captureDispatcherRun(dir, ['view']);
      assert.equal(view.exitStatus, 0);
      assert.match(view.stdout, /Measure>input/u);
      assert.match(view.stdout, /Rz<input/u);

      const latex = captureDispatcherRun(dir, ['export', '--latex-source'], { PATH: '' });
      assert.equal(latex.exitStatus, 0);
      assert.match(latex.stdout, /\\meter/u);
      assert.match(latex.stdout, /\$>\\mathrm\{input\}\$/u);
      assert.match(latex.stdout, /<\\mathrm\{input\}/u);
    });
  });

  it('rejects invalid classical names and measurement conditions', async () => {
    await withTempDir(async (dir) => {
      assert.deepEqual(
        captureDispatcherRun(dir, ['add', 'Measure', '--name', 'bad-name', '--qubit', '0', '--step', '0']),
        { exitStatus: 1, stderr: 'invalid classical bit name: bad-name\n', stdout: '' }
      );
      assert.deepEqual(
        captureDispatcherRun(dir, ['add', 'Measure', '--if', 'bit', '--qubit', '0', '--step', '0']),
        { exitStatus: 1, stderr: 'if is not supported for Measure\n', stdout: '' }
      );
    });
  });
});
