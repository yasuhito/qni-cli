import assert from "node:assert/strict";
import test from "node:test";

import { QniRuntime } from "../../src/qni-tools/runtime";

test("uses Node to run qni.js when Pi is a Bun-compiled executable", () => {
  assert.equal(
    QniRuntime.executable({ ...process.versions, bun: "1.2.0" }, "/path/to/pi"),
    "node"
  );
});

test("keeps the current executable when Pi runs under Node", () => {
  assert.equal(
    QniRuntime.executable(process.versions, process.execPath),
    process.execPath
  );
});
