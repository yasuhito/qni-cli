import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { describe, it } from 'node:test';

import {
  commandLineArgs,
  runSubprocess
} from '../../src/process/process_compatibility';

class StringSink extends Writable {
  readonly chunks: Buffer[] = [];

  _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    callback();
  }

  text(): string {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-ts-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe('runSubprocess', () => {
  it('forwards stdout, stderr, and exit status', async () => {
    const stdout = new StringSink();
    const stderr = new StringSink();
    const result = await runSubprocess({
      args: [
        '-e',
        "process.stdout.write('stdout from child\\n'); process.stderr.write('stderr from child\\n'); process.exit(7);"
      ],
      command: process.execPath,
      cwd: process.cwd(),
      stderr,
      stdout
    });

    assert.equal(result.exitStatus, 7);
    assert.equal(result.signal, null);
    assert.equal(stdout.text(), 'stdout from child\n');
    assert.equal(stderr.text(), 'stderr from child\n');
  });

  it('passes cwd, argv, and env to the child process', async () => {
    await withTempDir(async (dir) => {
      const probePath = path.join(dir, 'probe.js');
      await writeFile(
        probePath,
        [
          'const payload = {',
          '  cwd: process.cwd(),',
          '  argv: process.argv.slice(2),',
          '  env: process.env.QNI_COMPAT_TEST,',
          '};',
          'process.stdout.write(JSON.stringify(payload));'
        ].join('\n')
      );

      const stdout = new StringSink();
      const result = await runSubprocess({
        args: [probePath, 'alpha', 'beta'],
        command: process.execPath,
        cwd: dir,
        env: { QNI_COMPAT_TEST: 'present' },
        stdout
      });

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(JSON.parse(stdout.text()), {
        argv: ['alpha', 'beta'],
        cwd: dir,
        env: 'present'
      });
    });
  });
});

describe('commandLineArgs', () => {
  it('normalizes direct node and npm bin argv shapes', () => {
    assert.deepEqual(commandLineArgs(['/usr/bin/node', '/repo/dist/cli.js', 'add', 'H']), [
      'add',
      'H'
    ]);
    assert.deepEqual(commandLineArgs(['/usr/bin/node', '/usr/local/bin/qni', 'run']), ['run']);
  });
});
