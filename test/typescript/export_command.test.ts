import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface PngMetadata {
  readonly height: number;
  readonly transparent: boolean;
  readonly width: number;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-export-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function captureDispatcherRun(
  cwd: string,
  argv: string[],
  env: NodeJS.ProcessEnv = { ...process.env }
): CapturedRun {
  let stdout = '';
  let stderr = '';
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean => {
    stdout += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: BufferEncoding | ((error?: Error | null) => void)
  ): boolean => {
    stderr += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString();
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    }
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  }) as typeof process.stderr.write;

  try {
    const dispatcher = createDispatcher({
      cwd,
      env,
      projectRoot: process.cwd()
    });

    return {
      exitStatus: dispatcher.run(argv),
      stderr,
      stdout
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(path.join(dir, 'circuit.json'), `${JSON.stringify(circuit, null, 2)}\n`);
}

async function rubyOracle(dir: string, argv: string[]): Promise<CapturedRun> {
  return captureDispatcherRun(dir, argv, { ...process.env, QNI_USE_RUBY: '1' });
}

function pngMetadata(actualPath: string): PngMetadata {
  const script = `
from PIL import Image
import json
import sys

image = Image.open(sys.argv[1])
rgba = image.convert("RGBA")
alpha = rgba.getchannel("A")
print(json.dumps({
    "width": image.width,
    "height": image.height,
    "transparent": alpha.getextrema()[0] < 255
}))
`;
  const result = spawnSync(path.join(process.cwd(), '.python-symbolic', 'bin', 'python'), ['-c', script, actualPath], {
    encoding: 'utf8'
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as PngMetadata;
}

describe('export command TypeScript route', () => {
  it('renders qcircuit LaTeX source like the Ruby oracle without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [
          ['•', 'X'],
          ['Swap', 'Swap']
        ]
      });

      const result = captureDispatcherRun(dir, ['export', '--latex-source'], { PATH: '' });
      const oracle = await rubyOracle(dir, ['export', '--latex-source']);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, oracle.stdout);
    });
  });

  it('renders captioned light-theme LaTeX source like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const argv = [
        'export',
        '--latex-source',
        '--caption',
        'π & CNOT',
        '--caption-position',
        'top',
        '--light'
      ];
      const result = captureDispatcherRun(dir, argv, { PATH: '' });
      const oracle = await rubyOracle(dir, argv);

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, oracle.stdout);
    });
  });

  it('rejects malformed --caption-size values like the Ruby oracle without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      for (const value of ['1abc', 'abc', 'NaN', 'Infinity', '0x10', '5.', '-1', '-1.5', '.5']) {
        const argv = ['export', '--latex-source', '--caption-size', value];
        const result = captureDispatcherRun(dir, argv, { PATH: '' });
        const oracle = await rubyOracle(dir, argv);

        assert.equal(result.exitStatus, oracle.exitStatus, value);
        assert.equal(result.stdout, oracle.stdout, value);
        assert.equal(result.stderr, oracle.stderr, value);
      }
    });
  });

  it('reports malformed controlled and swap steps like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      for (const circuit of [
        {
          qubits: 3,
          cols: [['•', 'H', 'X']]
        },
        {
          qubits: 3,
          cols: [['Swap', 'Swap', 'H']]
        }
      ]) {
        await writeCircuit(dir, circuit);

        const argv = ['export', '--latex-source'];
        const result = captureDispatcherRun(dir, argv, { PATH: '' });
        const oracle = await rubyOracle(dir, argv);

        assert.equal(result.exitStatus, oracle.exitStatus);
        assert.equal(result.stdout, oracle.stdout);
        assert.equal(result.stderr, oracle.stderr);
      }
    });
  });

  it('writes LaTeX source to --output without stdout like Ruby', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['T†']]
      });

      const result = captureDispatcherRun(dir, ['export', '--latex-source', '--output', 'nested/circuit.tex'], {
        PATH: ''
      });
      const output = await readFile(path.join(dir, 'nested', 'circuit.tex'), 'utf8');
      const oracle = await rubyOracle(dir, ['export', '--latex-source', '--output', 'nested/circuit.tex']);
      const oracleOutput = await readFile(path.join(dir, 'nested', 'circuit.tex'), 'utf8');

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(output, oracleOutput);
      assert.equal(oracle.exitStatus, 0);
      assert.equal(oracle.stdout, '');
      assert.equal(oracle.stderr, '');
    });
  });

  it('exports state-vector PNG like the Ruby oracle without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, [
        'export',
        '--state-vector',
        '--png',
        '--light',
        '--output',
        'typescript-state.png'
      ]);
      const oracle = await rubyOracle(dir, [
        'export',
        '--state-vector',
        '--png',
        '--light',
        '--output',
        'ruby-state.png'
      ]);

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.deepEqual(pngMetadata(path.join(dir, 'typescript-state.png')), pngMetadata(path.join(dir, 'ruby-state.png')));
      assert.equal(pngMetadata(path.join(dir, 'typescript-state.png')).transparent, true);
    });
  });

  it('exports circle-notation PNG like the Ruby oracle through the retained Python helper contract', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [[1, 1]],
        initial_state: {
          format: 'ket_sum_v1',
          terms: [{ basis: 'Φ+', coefficient: '1' }]
        }
      });

      const result = captureDispatcherRun(dir, [
        'export',
        '--circle-notation',
        '--png',
        '--light',
        '--output',
        'typescript-circles.png'
      ]);
      const oracle = await rubyOracle(dir, [
        'export',
        '--circle-notation',
        '--png',
        '--light',
        '--output',
        'ruby-circles.png'
      ]);

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.deepEqual(
        pngMetadata(path.join(dir, 'typescript-circles.png')),
        pngMetadata(path.join(dir, 'ruby-circles.png'))
      );
      assert.equal(pngMetadata(path.join(dir, 'typescript-circles.png')).transparent, true);
    });
  });

  it('writes distinct state-vector and circle-notation PNG contents on the TypeScript route', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [[1, 1]],
        initial_state: {
          format: 'ket_sum_v1',
          terms: [{ basis: 'Φ+', coefficient: '1' }]
        }
      });

      const circleResult = captureDispatcherRun(dir, [
        'export',
        '--circle-notation',
        '--png',
        '--output',
        'circles.png'
      ]);
      const stateResult = captureDispatcherRun(dir, [
        'export',
        '--state-vector',
        '--png',
        '--output',
        'state.png'
      ]);

      assert.equal(circleResult.exitStatus, 0);
      assert.equal(circleResult.stdout, '');
      assert.equal(circleResult.stderr, '');
      assert.equal(stateResult.exitStatus, 0);
      assert.equal(stateResult.stdout, '');
      assert.equal(stateResult.stderr, '');
      assert.notDeepEqual(await readFile(path.join(dir, 'circles.png')), await readFile(path.join(dir, 'state.png')));
    });
  });

  it('prints export help without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['export', '--help'], { PATH: '' });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /qni export --latex-source \[--output=PATH\]/u);
      assert.match(result.stdout, /qni export --circle-notation --png --output=PATH/u);
    });
  });

  it('keeps regular PNG export on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--png', '--output', 'circuit.png'], { PATH: '' });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('leaves value-like option ambiguity on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--latex-source', '--output', '--light'], { PATH: '' });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('honors QNI_USE_RUBY for export', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--latex-source'], { PATH: '', QNI_USE_RUBY: '1' });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
