import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDispatcher } from '../../src/dispatcher';

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface PngStableProperties {
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

async function rubyOracleWithEnv(dir: string, argv: string[], env: NodeJS.ProcessEnv): Promise<CapturedRun> {
  return captureDispatcherRun(dir, argv, { ...process.env, ...env, QNI_USE_RUBY: '1' });
}

async function pngStableProperties(filePath: string): Promise<PngStableProperties> {
  const png = await readFile(filePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.deepEqual(png.subarray(0, 8), signature);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');

  return {
    height: png.readUInt32BE(20),
    transparent: pngColorTypeHasAlpha(png) || pngChunks(png).some((chunk) => chunk.type === 'tRNS'),
    width: png.readUInt32BE(16)
  };
}

function pngColorTypeHasAlpha(png: Buffer): boolean {
  return png[25] === 4 || png[25] === 6;
}

function pngChunks(png: Buffer): Array<{ readonly type: string }> {
  const chunks: Array<{ readonly type: string }> = [];
  let offset = 8;

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataEnd = offset + 8 + length;

    assert.ok(dataEnd + 4 <= png.length, `expected complete PNG chunk ${type}`);
    chunks.push({ type });
    offset = dataEnd + 4;

    if (type === 'IEND') {
      break;
    }
  }

  return chunks;
}

async function pathWithOnly(parentDir: string, commands: string[]): Promise<string> {
  const dir = path.join(parentDir, `path-${commands.join('-')}`);

  await rm(dir, { force: true, recursive: true });
  await mkdir(dir, { recursive: true });

  for (const command of commands) {
    await symlink(commandPath(command), path.join(dir, command));
  }

  return dir;
}

function commandPath(command: string): string {
  return execFileSync('bash', ['-lc', 'command -v -- "$1"', 'bash', command], { encoding: 'utf8' }).trim();
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

  it('prints export help without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ['export', '--help'], { PATH: '' });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /qni export --latex-source \[--output=PATH\]/u);
      assert.match(result.stdout, /qni export --circle-notation --png --output=PATH/u);
    });
  });

  it('renders regular transparent PNG like the Ruby oracle through TypeScript subprocesses', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const argv = ['export', '--png', '--light', '--output', 'typescript.png'];
      const oracleArgv = ['export', '--png', '--light', '--output', 'ruby.png'];
      const result = captureDispatcherRun(dir, argv);
      const oracle = await rubyOracle(dir, oracleArgv);
      const typeScriptPng = await pngStableProperties(path.join(dir, 'typescript.png'));
      const rubyPng = await pngStableProperties(path.join(dir, 'ruby.png'));

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(oracle.stdout, '');
      assert.equal(oracle.stderr, '');
      assert.deepEqual(typeScriptPng, rubyPng);
      assert.deepEqual(typeScriptPng, { height: 64, transparent: true, width: 64 });
    });
  });

  it('renders regular opaque PNG like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const argv = ['export', '--png', '--light', '--no-transparent', '--output', 'typescript.png'];
      const oracleArgv = ['export', '--png', '--light', '--no-transparent', '--output', 'ruby.png'];
      const result = captureDispatcherRun(dir, argv);
      const oracle = await rubyOracle(dir, oracleArgv);
      const typeScriptPng = await pngStableProperties(path.join(dir, 'typescript.png'));
      const rubyPng = await pngStableProperties(path.join(dir, 'ruby.png'));

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.deepEqual(typeScriptPng, rubyPng);
      assert.deepEqual(typeScriptPng, { height: 64, transparent: false, width: 64 });
    });
  });

  it('sizes an empty regular PNG from the rendered qcircuit columns', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: []
      });

      const result = captureDispatcherRun(dir, ['export', '--png', '--light', '--output', 'empty.png']);
      const typeScriptPng = await pngStableProperties(path.join(dir, 'empty.png'));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.deepEqual(typeScriptPng, { height: 64, transparent: true, width: 192 });
    });
  });

  it('renders caption PNG like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [['•', 'X']]
      });

      const argv = [
        'export',
        '--png',
        '--light',
        '--caption',
        'CNOT before cut',
        '--caption-position',
        'top',
        '--output',
        'typescript.png'
      ];
      const oracleArgv = [...argv.slice(0, -1), 'ruby.png'];
      const result = captureDispatcherRun(dir, argv);
      const oracle = await rubyOracle(dir, oracleArgv);
      const typeScriptPng = await pngStableProperties(path.join(dir, 'typescript.png'));
      const rubyPng = await pngStableProperties(path.join(dir, 'ruby.png'));

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
      assert.equal(oracle.stdout, '');
      assert.equal(oracle.stderr, '');
      assert.deepEqual(typeScriptPng, rubyPng);
      assert.equal(typeScriptPng.transparent, true);
    });
  });

  it('renders caption opaque PNG like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [['•', 'X']]
      });

      const argv = [
        'export',
        '--png',
        '--light',
        '--caption',
        'CNOT before cut',
        '--no-transparent',
        '--output',
        'typescript.png'
      ];
      const oracleArgv = [...argv.slice(0, -1), 'ruby.png'];
      const result = captureDispatcherRun(dir, argv);
      const oracle = await rubyOracle(dir, oracleArgv);
      const typeScriptPng = await pngStableProperties(path.join(dir, 'typescript.png'));
      const rubyPng = await pngStableProperties(path.join(dir, 'ruby.png'));

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.deepEqual(typeScriptPng, rubyPng);
      assert.equal(typeScriptPng.transparent, false);
    });
  });

  it('reports missing pdflatex like the Ruby oracle without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const missingPdfLatexPath = await pathWithOnly(dir, ['bundle']);
      const argv = ['export', '--png', '--output', 'circuit.png'];
      const result = captureDispatcherRun(dir, argv, { PATH: missingPdfLatexPath });
      const oracle = await rubyOracleWithEnv(dir, argv, { PATH: missingPdfLatexPath });

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.equal(result.stderr, 'pdflatex is required for qni export --png\n');
    });
  });

  it('reports pdflatex spawn errors with the underlying cause', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const pathDir = path.join(dir, 'path-denied-pdflatex');
      const pdfLatexPath = path.join(pathDir, 'pdflatex');

      await mkdir(pathDir, { recursive: true });
      await writeFile(pdfLatexPath, '#!/bin/sh\n');
      await chmod(pdfLatexPath, 0o644);

      const result = captureDispatcherRun(dir, ['export', '--png', '--output', 'circuit.png'], { PATH: pathDir });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /^pdflatex failed: .*EACCES\n$/u);
    });
  });

  it('reports missing pdftocairo like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const missingPdfToCairoPath = await pathWithOnly(dir, ['bundle', 'pdflatex']);
      const argv = ['export', '--png', '--output', 'circuit.png'];
      const result = captureDispatcherRun(dir, argv, { PATH: missingPdfToCairoPath });
      const oracle = await rubyOracleWithEnv(dir, argv, { PATH: missingPdfToCairoPath });

      assert.equal(result.exitStatus, oracle.exitStatus);
      assert.equal(result.stdout, oracle.stdout);
      assert.equal(result.stderr, oracle.stderr);
      assert.equal(result.stderr, 'pdftocairo is required for qni export --png\n');
    });
  });

  it('keeps state-vector PNG export on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--state-vector', '--png', '--output', 'state.png'], {
        PATH: ''
      });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });

  it('keeps circle-notation PNG export on Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--circle-notation', '--png', '--output', 'circles.png'], {
        PATH: ''
      });

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

  it('honors QNI_USE_RUBY for regular PNG export', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['export', '--png', '--output', 'circuit.png'], {
        PATH: '',
        QNI_USE_RUBY: '1'
      });

      assert.equal(result.exitStatus, 127);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'spawnSync bundle ENOENT\n');
    });
  });
});
