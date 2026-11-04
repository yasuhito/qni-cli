const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { PNG } = require("pngjs");
const {
  loadMatrix,
  renderSvg,
  renderPng,
  buildPlotData,
  formatTables,
  DEFAULT_MANIFEST,
  DEFAULT_OUTPUT,
} = require("./plot_model_effort_matrix.js");

const root = path.resolve(__dirname, "..");
test("loads exactly 21 conditions and all 1323 selected answers without model calls", () => {
  const matrix = loadMatrix(root);
  assert.equal(matrix.points.length, 21);
  assert.equal(matrix.selectedAnswers, 1323);
  assert.equal(matrix.attemptedCalls, 1325);
  assert.equal(matrix.points.filter((p) => p.resumed).length, 2);
});

test("keeps known token totals and unknown failed-attempt totals distinct", () => {
  const matrix = loadMatrix(root);
  const find = (model, effort) =>
    matrix.points.find((p) => p.model === model && p.effort === effort);
  assert.equal(find("gpt-6-luna", "off").tokens.outputTokens, 2736);
  assert.equal(find("gpt-6-luna", "max").tokens.outputTokens, 34754);
  assert.equal(find("claude-sonnet-5-5", "max").tokens.outputTokens, 266852);
  assert.equal(find("claude-opus-5-5", "max").tokens.outputTokens, 216205);
  for (const p of matrix.points.filter((p) => p.resumed)) {
    assert.equal(p.allAttemptOutputTokens, null);
    assert.equal(p.allAttemptRecordedCostUsd, null);
    assert.equal(p.executionErrors, 1);
  }
});

test("SVG has 21 data-matched points and four x-ordered lines without confidence bands", () => {
  const matrix = loadMatrix(root),
    svg = renderSvg(matrix);
  assert.equal(svg, renderSvg(matrix));
  assert.equal(
    svg,
    fs.readFileSync(path.join(root, DEFAULT_OUTPUT + ".svg"), "utf8")
  );
  assert.equal((svg.match(/data-point-id=/g) || []).length, 21);
  assert.equal((svg.match(/<polyline /g) || []).length, 4);
  // The only rectangle is the canvas background, drawn before all data lines.
  assert.equal((svg.match(/<rect /g) || []).length, 1);
  for (const p of matrix.points) {
    assert.ok(
      svg.includes(
        `data-point-id="${p.id}" data-output-tokens="${p.tokens.outputTokens}" data-pass-rate="${p.passRatePercent}"`
      )
    );
  }
  const lines = [
    ...svg.matchAll(
      /<polyline data-series="([^"]+)" data-effort-order="([^"]+)"/g
    ),
  ];
  for (const [, model, order] of lines) {
    assert.equal(
      order,
      matrix.points
        .filter((p) => p.model === model && !p.resumed)
        .sort((a, b) => a.tokens.outputTokens - b.tokens.outputTokens)
        .map((p) => p.effort)
        .join(",")
    );
  }
  assert.ok(svg.includes("x-axis is logarithmic"));
  assert.ok(svg.includes("No confidence bands"));
});

test("rejects a changed source hash rather than plotting stale or altered records", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qni-matrix-check-"));
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, DEFAULT_MANIFEST), "utf8")
    );
    manifest.points[0].source.callsSha256 = "0".repeat(64);
    const file = path.join(directory, "manifest.json");
    fs.writeFileSync(file, JSON.stringify(manifest));
    assert.throws(() => loadMatrix(root, file), /SHA-256 mismatch/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects a manifest whose collector identity differs from the archived source", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "qni-matrix-collector-")
  );
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, DEFAULT_MANIFEST), "utf8")
    );
    manifest.generatorSha256 = "0".repeat(64);
    const file = path.join(directory, "manifest.json");
    fs.writeFileSync(file, JSON.stringify(manifest));
    assert.throws(() => loadMatrix(root, file), /Collector identity mismatch/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects altered continuation assembly source bytes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "qni-matrix-assembly-")
  );
  try {
    const base = path.dirname(DEFAULT_MANIFEST);
    fs.mkdirSync(path.join(directory, base), { recursive: true });
    fs.copyFileSync(
      path.join(root, DEFAULT_MANIFEST),
      path.join(directory, DEFAULT_MANIFEST)
    );
    fs.cpSync(
      path.join(root, base, "derivation-sources"),
      path.join(directory, base, "derivation-sources"),
      { recursive: true }
    );
    fs.appendFileSync(
      path.join(
        directory,
        base,
        "derivation-sources/assemble-sonnet-max-once.mjs"
      ),
      "\n"
    );
    assert.throws(
      () => loadMatrix(directory),
      /SHA-256 mismatch:.*assemble-sonnet-max-once\.mjs/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("check-only runs with no credentials, no Pi on PATH, and no artifact changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qni-matrix-cli-"));
  const before = fs.readFileSync(path.join(root, DEFAULT_OUTPUT + ".svg"));
  try {
    const r = spawnSync(
      process.execPath,
      [path.join(root, "scripts/plot_model_effort_matrix.js"), "--check"],
      {
        cwd: directory,
        env: { HOME: directory, PATH: "", LANG: "C.UTF-8" },
        encoding: "utf8",
        timeout: 30000,
      }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).attemptedCalls, 1325);
    assert.deepEqual(
      fs.readFileSync(path.join(root, DEFAULT_OUTPUT + ".svg")),
      before
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("published plot JSON exactly matches regenerated data", () => {
  const expected =
    JSON.stringify(buildPlotData(root, loadMatrix(root)), null, 2) + "\n";
  assert.equal(
    fs.readFileSync(path.join(root, DEFAULT_OUTPUT + ".json"), "utf8"),
    expected
  );
});

test("published result table exactly matches regenerated Markdown", () => {
  assert.equal(
    fs.readFileSync(
      path.join(
        root,
        "research/analyses/model-effort-matrix-2026-11-04/matrix-results.md"
      ),
      "utf8"
    ),
    formatTables(loadMatrix(root))
  );
});

test("published PNG is nonblank at the documented resolution", () => {
  const published = fs.readFileSync(path.join(root, DEFAULT_OUTPUT + ".png"));
  assert.deepEqual(renderPng(root, renderSvg(loadMatrix(root))), published);
  const image = PNG.sync.read(published);
  assert.equal(image.width, 1600);
  assert.equal(image.height, 1120);
  let ink = 0;
  for (let i = 0; i < image.data.length; i += 4)
    if (
      image.data[i] < 245 ||
      image.data[i + 1] < 245 ||
      image.data[i + 2] < 245
    )
      ink++;
  assert.ok(ink > 30000);
});
