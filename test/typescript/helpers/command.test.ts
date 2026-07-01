import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { captureProcessWrites, withTempDir } from './command';

function assertCaptureProcessWritesRejectsAsyncCallbackType(): void {
  // The helper must reject async callbacks during type checking, before runtime.
  // @ts-expect-error captureProcessWrites only supports synchronous callbacks.
  captureProcessWrites(async () => undefined);
}

describe('TypeScript command test helpers', () => {
  it('keeps temporary directories under tmpdir when prefix includes path segments', async () => {
    await withTempDir(
      (dir) => {
        assert.equal(path.dirname(dir), tmpdir());
        assert.match(path.basename(dir), /^qni-review-/);
      },
      { prefix: '../qni-review-' }
    );
  });

  it('falls back to the default temporary directory prefix for empty prefixes', async () => {
    await withTempDir(
      (dir) => {
        assert.equal(path.dirname(dir), tmpdir());
        assert.match(path.basename(dir), /^qni-cli-ts-/);
      },
      { prefix: '' }
    );
  });

  it('rejects async callbacks when capturing process writes', () => {
    assert.throws(
      () => captureProcessWrites((async () => undefined) as () => unknown),
      /only supports synchronous callbacks/
    );
  });
});
