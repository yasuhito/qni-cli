import assert from 'node:assert/strict';
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
  readonly colorType: number;
  readonly frameCount: number;
  readonly height: number;
  readonly width: number;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-'));

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

function rubyOracle(dir: string, argv: string[], env: NodeJS.ProcessEnv = process.env): CapturedRun {
  return captureDispatcherRun(dir, argv, { ...env, QNI_USE_RUBY: '1' });
}

async function pngMetadata(filePath: string): Promise<PngMetadata> {
  const bytes = await readFile(filePath);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let frameCount = 0;

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const dataOffset = offset + 8;

    if (type === 'IHDR') {
      width = bytes.readUInt32BE(dataOffset);
      height = bytes.readUInt32BE(dataOffset + 4);
      colorType = bytes[dataOffset + 9] ?? -1;
    }

    if (type === 'fcTL') {
      frameCount += 1;
    }

    offset = dataOffset + length + 4;
  }

  return { colorType, frameCount, height, width };
}

describe('bloch command TypeScript route', () => {
  it('renders PNG stable properties like the Ruby oracle without invoking Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const circuit = {
        qubits: 1,
        cols: [['H']]
      };
      await writeCircuit(dir, circuit);
      const oracleDir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-oracle-'));

      try {
        await writeCircuit(oracleDir, circuit);

        const result = captureDispatcherRun(dir, ['bloch', '--png', '--output', 'bloch.png'], { ...process.env, PATH: '' });
        const oracle = rubyOracle(oracleDir, ['bloch', '--png', '--output', 'bloch.png']);
        const metadata = await pngMetadata(path.join(dir, 'bloch.png'));
        const oracleMetadata = await pngMetadata(path.join(oracleDir, 'bloch.png'));

        assert.equal(result.exitStatus, oracle.exitStatus);
        assert.equal(result.stdout, oracle.stdout);
        assert.equal(result.stderr, oracle.stderr);
        assert.deepEqual(metadata, oracleMetadata);
        assert.equal(metadata.width, 512);
        assert.equal(metadata.height, 512);
        assert.equal(metadata.colorType, 6);
      } finally {
        await rm(oracleDir, { force: true, recursive: true });
      }
    });
  });

  it('renders trajectory PNG bytes like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      const circuit = {
        qubits: 1,
        cols: [['X']]
      };
      await writeCircuit(dir, circuit);
      const oracleDir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-oracle-'));

      try {
        await writeCircuit(oracleDir, circuit);
        const argv = ['bloch', '--png', '--trajectory', '--light', '--output', 'bloch-trajectory.png'];

        const result = captureDispatcherRun(dir, argv, { ...process.env, PATH: '' });
        const oracle = rubyOracle(oracleDir, argv);

        assert.equal(result.exitStatus, 0);
        assert.equal(result.stdout, oracle.stdout);
        assert.equal(result.stderr, oracle.stderr);
        assert.deepEqual(
          await readFile(path.join(dir, 'bloch-trajectory.png')),
          await readFile(path.join(oracleDir, 'bloch-trajectory.png'))
        );
      } finally {
        await rm(oracleDir, { force: true, recursive: true });
      }
    });
  });

  it('renders APNG frame count like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      const circuit = {
        qubits: 1,
        cols: [['Ry(π/2)']]
      };
      await writeCircuit(dir, circuit);
      const oracleDir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-oracle-'));

      try {
        await writeCircuit(oracleDir, circuit);
        const argv = ['bloch', '--apng', '--output', 'bloch.png'];

        const result = captureDispatcherRun(dir, argv, { ...process.env, PATH: '' });
        const oracle = rubyOracle(oracleDir, argv);
        const metadata = await pngMetadata(path.join(dir, 'bloch.png'));
        const oracleMetadata = await pngMetadata(path.join(oracleDir, 'bloch.png'));

        assert.equal(result.exitStatus, oracle.exitStatus);
        assert.equal(result.stdout, oracle.stdout);
        assert.equal(result.stderr, oracle.stderr);
        assert.equal(metadata.frameCount, oracleMetadata.frameCount);
        assert.ok(metadata.frameCount >= 2);
      } finally {
        await rm(oracleDir, { force: true, recursive: true });
      }
    });
  });

  it('emits inline Kitty graphics escape sequences like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      const circuit = {
        qubits: 1,
        cols: [['H']]
      };
      await writeCircuit(dir, circuit);
      const oracleDir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-oracle-'));

      try {
        await writeCircuit(oracleDir, circuit);
        const argv = ['bloch', '--inline'];
        const env = { ...process.env, QNI_TEST_FORCE_INLINE: '1' };

        const result = captureDispatcherRun(dir, argv, { ...env, PATH: '' });
        const oracle = rubyOracle(oracleDir, argv, env);

        assert.equal(result.exitStatus, oracle.exitStatus);
        assert.equal(result.stderr, oracle.stderr);
        assert.equal([...result.stdout.matchAll(/\u001b_G/gu)].length, [...oracle.stdout.matchAll(/\u001b_G/gu)].length);
        assert.match(result.stdout, /^\u001b_G/u);
      } finally {
        await rm(oracleDir, { force: true, recursive: true });
      }
    });
  });

  it('reports errors like the Ruby oracle', async () => {
    await withTempDir(async (dir) => {
      const circuit = {
        qubits: 2,
        cols: [[1, 1]]
      };
      await writeCircuit(dir, circuit);
      const oracleDir = await mkdtemp(path.join(tmpdir(), 'qni-cli-bloch-oracle-'));

      try {
        await writeCircuit(oracleDir, circuit);
        const argv = ['bloch', '--png', '--output', 'bloch.png'];

        const result = captureDispatcherRun(dir, argv, { ...process.env, PATH: '' });
        const oracle = rubyOracle(oracleDir, argv);

        assert.equal(result.exitStatus, oracle.exitStatus);
        assert.equal(result.stdout, oracle.stdout);
        assert.equal(result.stderr, oracle.stderr);
      } finally {
        await rm(oracleDir, { force: true, recursive: true });
      }
    });
  });

  it('honors QNI_USE_RUBY for bloch', async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [['H']]
      });

      const result = captureDispatcherRun(dir, ['bloch', '--png', '--output', 'bloch.png'], {
        PATH: '',
        QNI_USE_RUBY: '1'
      });

      assert.equal(result.exitStatus, 127);
      assert.match(result.stderr, /spawnSync bundle ENOENT/u);
    });
  });
});
