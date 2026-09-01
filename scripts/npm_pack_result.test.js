const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const { assertPackedFiles, resolvePackResult } = require('./npm_pack_result');

const expectedPackage = { name: 'qni-cli', version: '0.1.0' };

function withTempDir(callback) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-pack-result-'));

  try {
    callback(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
}

describe('npm pack result', () => {
  it('uses pack JSON when stdout has JSON and text noise before and after it', () => {
    withTempDir((tempRoot) => {
      fs.writeFileSync(path.join(tempRoot, 'qni-cli-noisy.tgz'), 'packed');
      const result = resolvePackResult({
        expectedPackage,
        tempRoot,
        stdout: [
          'mise: preparing node',
          '{"lifecycle":"prepack"}',
          '[{"name":"qni-cli","version":"0.1.0","filename":"qni-cli-noisy.tgz","files":[{"path":"dist/bin/qni.js"}]}]',
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

  it('ignores a different tarball named by trailing JSON noise', () => {
    withTempDir((tempRoot) => {
      const tarball = path.join(tempRoot, 'qni-cli-0.1.0.tgz');
      fs.writeFileSync(tarball, 'packed');
      fs.writeFileSync(path.join(tempRoot, 'diagnostic.tgz'), 'diagnostic');

      const result = resolvePackResult({
        tempRoot,
        expectedPackage,
        stdout: [
          '[{"name":"qni-cli","version":"0.1.0","filename":"qni-cli-0.1.0.tgz","files":[{"path":"LICENSE"}]}]',
          '{"level":"debug","name":"diagnostic","version":"1.0.0","filename":"diagnostic.tgz","files":[]}'
        ].join('\n'),
        stderr: ''
      });

      assert.equal(result.tarball, tarball);
    });
  });

  it('ignores a reported tarball that does not exist', () => {
    withTempDir((tempRoot) => {
      const tarball = path.join(tempRoot, 'qni-cli-fallback.tgz');
      fs.writeFileSync(tarball, 'packed');

      const result = resolvePackResult({
        expectedPackage,
        tempRoot,
        stdout: '{"name":"qni-cli","version":"0.1.0","filename":"missing.tgz","files":[]}',
        stderr: ''
      });

      assert.equal(result.tarball, tarball);
    });
  });

  it('accepts an object JSON result', () => {
    withTempDir((tempRoot) => {
      fs.writeFileSync(path.join(tempRoot, 'qni-cli-object.tgz'), 'packed');
      const result = resolvePackResult({
        expectedPackage,
        tempRoot,
        stdout: '{"qni-cli":{"name":"qni-cli","version":"0.1.0","filename":"qni-cli-object.tgz","files":[{"path":"LICENSE"}]}}',
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

describe('packed files', () => {
  it('rejects a directory at a required file path', () => {
    withTempDir((packageRoot) => {
      fs.mkdirSync(path.join(packageRoot, 'LICENSE'));

      assert.throws(() => assertPackedFiles(packageRoot), /packed qni-cli is missing LICENSE/);
    });
  });
});
