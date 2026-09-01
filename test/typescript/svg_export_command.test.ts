import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureDispatcherRun, withTempDir } from './helpers/command';

const TEMP_DIR_OPTIONS = { prefix: 'qni-cli-svg-export-' };

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

function svgDimensions(svg: string): { readonly height: number; readonly width: number } {
  const match = /^<svg [^>]*width="(?<width>\d+)" height="(?<height>\d+)"/u.exec(svg);

  assert.ok(match?.groups);
  return {
    height: Number(match.groups.height),
    width: Number(match.groups.width)
  };
}

describe('SVG export command', () => {
  it('renders SVG directly without LaTeX tools', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['H']] });

      const result = captureDispatcherRun(dir, ['export', '--svg'], { PATH: '' });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^<svg /u);
      assert.match(result.stdout, /color:#fff/u);
      assert.match(result.stdout, /fill="#000"/u);
      assert.match(result.stdout, /data-operation="gate"/u);
      assert.match(result.stdout, />H<\/text>/u);
    }, TEMP_DIR_OPTIONS);
  });

  it('renders every supported SVG primitive and Unicode label', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 5,
        cols: [
          ['H', 'P(π/2)', 'S†', 'X^½', 'Measure>result'],
          ['•', '•', 1, 1, 'X<input'],
          ['•', 1, 'Swap', 1, 'Swap']
        ]
      });

      const result = captureDispatcherRun(dir, ['export', '--svg', '--light', '--output', 'nested/circuit.svg'], { PATH: '' });
      const svg = await readFile(path.join(dir, 'nested', 'circuit.svg'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.match(svg, /color:#111/u);
      for (const operation of ['wire', 'wire-label', 'gate', 'control', 'control-line', 'cnot-target', 'swap', 'measurement']) {
        assert.match(svg, new RegExp(`data-operation="${operation}"`, 'u'), operation);
      }
      for (const label of ['P(π/2)', 'S†', '√X', '&gt;result', '&lt;input']) {
        assert.ok(svg.includes(label), label);
      }
      assert.match(svg, /class="meter-mark"/u);
      assert.match(svg, /class="swap-mark"/u);
      assert.match(svg, /data-qubit="4"/u);
    }, TEMP_DIR_OPTIONS);
  });

  it('masks wires inside ordinary gates, controlled gates, and measurements', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [
          ['H', 1, 1],
          ['•', 'H', 'Measure']
        ]
      });

      const result = captureDispatcherRun(dir, ['export', '--svg', '--light'], { PATH: '' });

      assert.equal(result.exitStatus, 0);
      assert.match(result.stdout, /<g data-operation="gate" data-step="0" data-qubit="0">\n<rect class="gate-box"[^>]* fill="#fff"/u);
      assert.match(result.stdout, /<g data-operation="gate" data-step="1" data-qubit="1">\n<rect class="gate-box"[^>]* fill="#fff"/u);
      assert.match(result.stdout, /<g data-operation="measurement" data-step="1" data-qubit="2">\n<rect class="meter-box"[^>]* fill="#fff"/u);
    }, TEMP_DIR_OPTIONS);
  });

  it('expands the SVG viewport for long top and bottom captions', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [['H']] });
      const caption = 'A caption that is wider than a one-gate circuit';

      for (const position of ['top', 'bottom']) {
        const result = captureDispatcherRun(dir, [
          'export', '--svg', '--light', '--caption', caption,
          '--caption-position', position, '--caption-size', '48'
        ], { PATH: '' });
        const dimensions = svgDimensions(result.stdout);

        assert.equal(result.exitStatus, 0);
        assert.ok(dimensions.width >= [...caption].length * 48 + 32, position);
        assert.ok(dimensions.height >= 64 + Math.ceil(48 * 1.3) + 32, position);
        assert.match(result.stdout, new RegExp(`data-caption-position="${position}"`, 'u'));
      }
    }, TEMP_DIR_OPTIONS);
  });

  it('keeps SVG placements and connections aligned with the ASCII circuit', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 5,
        cols: [
          ['•', 1, '•', 1, 'X'],
          [1, 'Swap', 1, 'Swap', '•']
        ]
      });

      const ascii = captureDispatcherRun(dir, ['view'], { PATH: '' });
      const svg = captureDispatcherRun(dir, ['export', '--svg'], { PATH: '' });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: ──■──/u);
      assert.match(ascii.stdout, /q2: ──■──/u);
      assert.match(ascii.stdout, /q4: ┤ X ├/u);
      assert.match(ascii.stdout, /q1: .*X/u);
      assert.match(ascii.stdout, /q3: .*X/u);
      assert.match(svg.stdout, /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="4"/u);
      assert.match(svg.stdout, /data-operation="control" data-step="0" data-qubit="2" data-target-qubit="4"/u);
      assert.match(svg.stdout, /data-operation="control-line" data-step="0" data-from-qubit="0" data-to-qubit="4"/u);
      assert.match(svg.stdout, /data-operation="cnot-target" data-step="0" data-qubit="4"/u);
      assert.match(svg.stdout, /data-operation="swap" data-step="1" data-qubit="1" data-pair-qubit="3"/u);
      assert.match(svg.stdout, /data-operation="swap" data-step="1" data-qubit="3" data-pair-qubit="1"/u);
      assert.match(svg.stdout, /data-operation="control-line" data-step="1" data-from-qubit="1" data-to-qubit="4"/u);
    }, TEMP_DIR_OPTIONS);
  });

  it('keeps an independent measurement beside a controlled gate in ASCII and SVG', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 3, cols: [['•', 'H', 'Measure']] });

      const ascii = captureDispatcherRun(dir, ['view'], { PATH: '' });
      const svg = captureDispatcherRun(dir, ['export', '--svg'], { PATH: '' });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: .*■/u);
      assert.match(ascii.stdout, /q1: .*H/u);
      assert.match(ascii.stdout, /q2: .*Measure/u);
      assert.match(svg.stdout, /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="1"/u);
      assert.match(svg.stdout, /data-operation="gate" data-step="0" data-qubit="1"/u);
      assert.match(svg.stdout, /data-operation="measurement" data-step="0" data-qubit="2"/u);
    }, TEMP_DIR_OPTIONS);
  });

  it('keeps an independent measurement inside a control span in ASCII and SVG', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 3, cols: [['•', 'Measure', 'H']] });

      const ascii = captureDispatcherRun(dir, ['view'], { PATH: '' });
      const svg = captureDispatcherRun(dir, ['export', '--svg'], { PATH: '' });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: .*■/u);
      assert.match(ascii.stdout, /┌────│────┐/u);
      assert.match(ascii.stdout, /q1: .*Measure/u);
      assert.match(ascii.stdout, /└──┬─┴─┬──┘/u);
      assert.match(ascii.stdout, /q2: .*H/u);
      assert.match(svg.stdout, /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="2"/u);
      assert.match(svg.stdout, /data-operation="measurement" data-step="0" data-qubit="1"/u);
      assert.match(svg.stdout, /data-operation="gate" data-step="0" data-qubit="2"/u);
    }, TEMP_DIR_OPTIONS);
  });
});
