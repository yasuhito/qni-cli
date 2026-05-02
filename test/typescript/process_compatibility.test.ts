import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { describe, it } from 'node:test';

import {
  chooseCommandImplementation,
  commandLineArgs,
  createRubyFallbackInvocation,
  runRubyFallback,
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
          '  env: process.env.QNI_COMPAT_TEST',
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

describe('Ruby fallback process compatibility', () => {
  it('builds a Ruby fallback invocation that preserves cwd, argv, and env', () => {
    const invocation = createRubyFallbackInvocation({
      argv: ['run', '--symbolic'],
      cwd: '/tmp/qni-work',
      env: { PATH: '/usr/bin', QNI_USE_RUBY: '1' },
      projectRoot: '/repo/qni-cli'
    });

    assert.equal(invocation.command, 'bundle');
    assert.deepEqual(invocation.args, ['exec', '/repo/qni-cli/bin/qni', 'run', '--symbolic']);
    assert.equal(invocation.cwd, '/tmp/qni-work');
    assert.equal(invocation.env.BUNDLE_GEMFILE, '/repo/qni-cli/Gemfile');
    assert.equal(invocation.env.PATH, '/usr/bin');
    assert.equal(invocation.env.QNI_USE_RUBY, '1');
  });

  it('forwards Ruby fallback stdout', async () => {
    await withTempDir(async (dir) => {
      const stdout = new StringSink();
      const stderr = new StringSink();
      const result = await runRubyFallback({
        argv: ['clear', '--help'],
        cwd: dir,
        projectRoot: process.cwd(),
        stderr,
        stdout
      });

      assert.equal(result.exitStatus, 0);
      assert.match(stdout.text(), /^Usage:\n  qni clear\n/u);
      assert.equal(stderr.text(), '');
    });
  });

  it('forwards Ruby fallback stderr and exit status', async () => {
    await withTempDir(async (dir) => {
      const stdout = new StringSink();
      const stderr = new StringSink();
      const result = await runRubyFallback({
        argv: ['__missing_command__'],
        cwd: dir,
        projectRoot: process.cwd(),
        stderr,
        stdout
      });

      assert.equal(result.exitStatus, 1);
      assert.equal(stdout.text(), '');
      assert.equal(stderr.text(), 'Could not find command "__missing_command__".\n');
    });
  });
});

describe('dispatcher-facing helpers', () => {
  it('forces the Ruby implementation when QNI_USE_RUBY is 1', () => {
    assert.deepEqual(
      chooseCommandImplementation({
        argv: ['clear'],
        env: { QNI_USE_RUBY: '1' },
        migratedCommands: new Set(['clear'])
      }),
      { kind: 'ruby', reason: 'forced-by-env' }
    );
  });

  it('chooses Ruby fallback for commands that are not migrated', () => {
    assert.deepEqual(
      chooseCommandImplementation({
        argv: ['bloch'],
        env: {},
        migratedCommands: new Set(['clear'])
      }),
      { command: 'bloch', kind: 'ruby', reason: 'unmigrated-command' }
    );
  });

  it('chooses TypeScript for migrated commands when Ruby is not forced', () => {
    assert.deepEqual(
      chooseCommandImplementation({
        argv: ['clear'],
        env: {},
        migratedCommands: new Set(['clear'])
      }),
      { command: 'clear', kind: 'typescript' }
    );
  });

  it('normalizes direct node and npm bin argv shapes', () => {
    assert.deepEqual(commandLineArgs(['/usr/bin/node', '/repo/dist/cli.js', 'add', 'H']), [
      'add',
      'H'
    ]);
    assert.deepEqual(commandLineArgs(['/usr/bin/node', '/usr/local/bin/qni', 'run']), ['run']);
  });
});
