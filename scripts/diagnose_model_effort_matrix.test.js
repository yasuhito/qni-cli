const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  originalAnswers,
  runDiagnostic,
} = require("./diagnose_model_effort_matrix");
const root = path.resolve(__dirname, "..");

test("offline diagnostic identifies all 1323 original answers without grading or model calls", () => {
  const answers = originalAnswers(root);
  assert.equal(answers.length, 1323);
  assert.equal(new Set(answers.map((a) => a.pointId)).size, 21);
  assert.equal(answers.filter((a) => a.targeted).length, 81);
  assert.equal(
    answers.filter((a) => a.targeted && a.oldStatus === "disallowed").length,
    76
  );
  assert.equal(
    answers.filter((a) => a.targeted && a.oldStatus === "error").length,
    5
  );
  for (const id of new Set(answers.map((a) => a.pointId)))
    assert.equal(answers.filter((a) => a.pointId === id).length, 63);
});

test("diagnostic help runs without Pi, credentials, or output artifacts", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/diagnose_model_effort_matrix.js"), "--help"],
    {
      cwd: root,
      env: { PATH: "", HOME: "/nonexistent" },
      encoding: "utf8",
      timeout: 10000,
    }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No model calls/);
});

test("unknown diagnostic modes cannot accidentally start the full cohort", () => {
  assert.throws(
    () => runDiagnostic("unknown", "/unused"),
    /must be targeted or all/
  );
});
