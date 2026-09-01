const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const { resolvePackResult } = require('./npm_pack_result');

function withTempDir(callback) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-pack-result-'));

  try {
    callback(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
}

describe('npm pack result', () => {
  it('uses the last JSON value when stdout has noise before and after it', () => {
    withTempDir((tempRoot) => {
      const result = resolvePackResult({
        tempRoot,
        stdout: [
          'mise: preparing node',
          '{"lifecycle":"prepack"}',
          '[{"filename":"qni-cli-noisy.tgz","files":[{"path":"dist/bin/qni.js"}]}]',
          'lifecycle output after JSON'
        ].join('\n'),
        stderr: 'prepack warning'
      });

      assert.deepEqual(result, {
        files: ['dist/bin/qni.js'],
        tarball: path.join(tempRoot, 'qni-cli-noisy.tgz')
      });
    });
  });

  it('accepts an object JSON result', () => {
    withTempDir((tempRoot) => {
      const result = resolvePackResult({
        tempRoot,
        stdout: '{"qni-cli":{"filename":"qni-cli-object.tgz","files":[{"path":"LICENSE"}]}}',
        stderr: ''
      });

      assert.deepEqual(result, {
        files: ['LICENSE'],
        tarball: path.join(tempRoot, 'qni-cli-object.tgz')
      });
    });
  });

  it('falls back to the only tarball for empty stdout', () => {
    withTempDir((tempRoot) => {
      const tarball = path.join(tempRoot, 'qni-cli-fallback.tgz');
      fs.writeFileSync(tarball, 'packed');

      assert.deepEqual(resolvePackResult({ tempRoot, stdout: '', stderr: '' }), {
        files: [],
        tarball
      });
    });
  });

  it('fails when no filename and no tarball can be resolved', () => {
    withTempDir((tempRoot) => {
      assert.throws(
        () => resolvePackResult({ tempRoot, stdout: 'pack stdout', stderr: 'pack stderr' }),
        (error) => {
          assert.match(error.message, /pack stdout/);
          assert.match(error.message, /pack stderr/);
          return true;
        }
      );
    });
  });

  it('fails when more than one fallback tarball exists', () => {
    withTempDir((tempRoot) => {
      fs.writeFileSync(path.join(tempRoot, 'first.tgz'), 'first');
      fs.writeFileSync(path.join(tempRoot, 'second.tgz'), 'second');

      assert.throws(
        () => resolvePackResult({ tempRoot, stdout: '[]', stderr: 'ambiguous pack' }),
        /found 2 fallback tarballs/
      );
    });
  });
});
