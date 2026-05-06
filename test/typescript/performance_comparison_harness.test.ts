import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qni-cli-perf-test-'));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe('Ruby / TypeScript performance comparison harness', () => {
  it('writes a JSON artifact comparing the same workload through Ruby and TypeScript', async () => {
    await withTempDir(async (dir) => {
      const outputPath = path.join(dir, 'comparison.json');
      const result = spawnSync(
        process.execPath,
        [
          'scripts/compare_ruby_typescript_performance.js',
          '--workload',
          'test/fixtures/performance/large_add_h_workload.json',
          '--repeat',
          '1',
          '--warm-up',
          '0',
          '--output',
          outputPath
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 120_000
        }
      );

      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.signal, null, `script terminated with signal ${result.signal}`);
      assert.equal(result.status, 0, result.stderr);

      const report = JSON.parse(await readFile(outputPath, 'utf8'));
      const workload = report.workloads[0];

      assert.equal(report.schema_version, 1);
      assert.equal(report.repeat, 1);
      assert.equal(report.warm_up, 0);
      assert.equal(report.threshold_ratio, 1.2);
      assert.match(report.commit_sha, /^[0-9a-f]{7,40}$/u);
      assert.match(report.runtime_versions.node, /^v/u);
      assert.match(report.runtime_versions.ruby, /^ruby /u);
      assert.match(report.runtime_versions.typescript, /^Version /u);
      assert.equal(workload.name, 'large-add-h-8q-160steps');
      assert.equal(workload.command, 'qni add H --qubit 0 --step 160');
      assert.ok(workload.input_size_bytes > 1_000);
      assert.equal(workload.implementations.ruby.runs.length, 1);
      assert.equal(workload.implementations.typescript.runs.length, 1);
      assert.ok(workload.implementations.ruby.median_wall_clock_ms >= 0);
      assert.ok(workload.implementations.typescript.median_wall_clock_ms >= 0);
      assert.ok(workload.implementations.ruby.median_peak_memory_bytes > 0);
      assert.ok(workload.implementations.typescript.median_peak_memory_bytes > 0);
      assert.equal(typeof workload.comparison.investigation_required, 'boolean');
    });
  });

  it('does not let QNI_USE_RUBY force the TypeScript measurement through Ruby fallback', async () => {
    await withTempDir(async (dir) => {
      const fakeBinDir = path.join(dir, 'bin');
      const fakeBundlePath = path.join(fakeBinDir, 'bundle');
      const bundleLogPath = path.join(dir, 'bundle-calls.log');
      const outputPath = path.join(dir, 'comparison.json');
      const realBundle = spawnSync('which', ['bundle'], {
        encoding: 'utf8',
        timeout: 10_000
      });

      assert.equal(realBundle.error, undefined, realBundle.error?.message);
      assert.equal(realBundle.status, 0, realBundle.stderr);
      await mkdir(fakeBinDir);
      await writeFile(
        fakeBundlePath,
        [
          '#!/bin/sh',
          'printf "%s\\n" "$*" >> "$QNI_FAKE_BUNDLE_LOG"',
          'exec "$QNI_REAL_BUNDLE" "$@"',
          ''
        ].join('\n')
      );
      await chmod(fakeBundlePath, 0o755);

      const result = spawnSync(
        process.execPath,
        [
          'scripts/compare_ruby_typescript_performance.js',
          '--workload',
          'test/fixtures/performance/large_add_h_workload.json',
          '--repeat',
          '1',
          '--warm-up',
          '0',
          '--output',
          outputPath
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${fakeBinDir}:${process.env.PATH ?? ''}`,
            QNI_FAKE_BUNDLE_LOG: bundleLogPath,
            QNI_REAL_BUNDLE: realBundle.stdout.trim(),
            QNI_USE_RUBY: '1'
          },
          timeout: 120_000
        }
      );

      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.signal, null, `script terminated with signal ${result.signal}`);
      assert.equal(result.status, 0, result.stderr);

      const bundleCalls = (await readFile(bundleLogPath, 'utf8')).trim().split('\n');

      assert.equal(bundleCalls.length, 1);
      assert.equal(bundleCalls[0], `exec ${path.join(process.cwd(), 'bin', 'qni')} add H --qubit 0 --step 160`);
    });
  });
});
