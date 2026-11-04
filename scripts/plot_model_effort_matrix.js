#!/usr/bin/env node
// 保存済み記録だけを検証・描画する。モデル呼び出しは行わない。
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { Resvg } = require("@resvg/resvg-js");

const BASE = "research/analyses/model-effort-matrix-2026-11-04";
const DEFAULT_MANIFEST = `${BASE}/matrix-manifest.json`;
const DEFAULT_OUTPUT = "research/plots/model-effort-matrix-2026-11-04";
const KEYS = [
  "inputTokens",
  "outputTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "totalTokens",
];
const SERIES = [
  {
    provider: "openai-codex",
    model: "gpt-6-luna",
    color: "#0067a3",
    efforts: ["off", "low", "medium", "high", "xhigh", "max"],
  },
  {
    provider: "openai-codex",
    model: "gpt-6.1-sol",
    color: "#b84400",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
  {
    provider: "claude-bridge",
    model: "claude-sonnet-5-5",
    color: "#007552",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
  {
    provider: "claude-bridge",
    model: "claude-opus-5-5",
    color: "#8b4291",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
];
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function loadMatrix(
  root,
  manifestPath = DEFAULT_MANIFEST,
  { checkRaw = false } = {}
) {
  const file = (relative) => {
    const resolved = path.resolve(root, relative);
    assert.ok(
      resolved.startsWith(path.resolve(root) + path.sep),
      `Outside repository: ${relative}`
    );
    return resolved;
  };
  const read = (relative) => fs.readFileSync(file(relative));
  const json = (relative) => JSON.parse(read(relative));
  const verify = (relative, expected) =>
    assert.equal(
      sha(read(relative)),
      expected,
      `SHA-256 mismatch: ${relative}`
    );
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(root, manifestPath))
  );
  const derivationDir = `${BASE}/derivation-sources`;
  const derivation = json(`${derivationDir}/source-index.json`);
  assert.equal(derivation.schemaVersion, 1);
  assert.deepEqual(Object.keys(derivation.sources).sort(), [
    "assemble-luna-max-once.mjs",
    "assemble-sonnet-max-once.mjs",
    "collect-final-matrix.mjs",
  ]);
  for (const [source, expected] of Object.entries(derivation.sources))
    verify(`${derivationDir}/${source}`, expected);
  assert.equal(
    derivation.sources["collect-final-matrix.mjs"],
    manifest.generatorSha256,
    "Collector identity mismatch"
  );
  for (const [source, expected] of Object.entries(
    json(`${BASE}/source-artifact-sha256.json`)
  ))
    verify(source, expected);
  assert.equal(manifest.points.length, 21);
  assert.equal(new Set(manifest.points.map((p) => p.id)).size, 21);
  verify(manifest.usageIndex, manifest.usageIndexSha256);
  const usage = json(manifest.usageIndex);
  const index = new Map(
    usage.map((x) => [`${x.sourceCalls}:${x.sourceCall}`, x])
  );
  assert.equal(index.size, 1325);
  const sources = new Map();
  const promptHashes = new Map();
  for (const a of manifest.attempts) {
    verify(a.callsFile, a.callsSha256);
    verify(a.envelope, a.envelopeSha256);
    const calls = json(a.callsFile).calls;
    const envelope = json(a.envelope);
    assert.equal(envelope.codeHead, a.codeHead);
    assert.equal(envelope.piVersion, "1.5.0");
    assert.ok([300, 600, 3600].includes(a.timeoutSeconds));
    if (envelope.maximumPerTaskSeconds !== undefined)
      assert.equal(envelope.maximumPerTaskSeconds, a.timeoutSeconds);
    if (a.kind === "trial") {
      const metadata = json(`${a.path}/metadata.json`),
        result = json(`${a.path}/result.json`);
      assert.equal(metadata.pi.version, "1.5.0");
      assert.deepEqual(
        metadata.taskSelection,
        calls.map((c) => c.taskId)
      );
      assert.equal(result.results.length, calls.length);
      assert.equal(result.summary.total, calls.length);
      for (const status of ["passed", "failed", "disallowed", "error"])
        assert.equal(
          result.summary[status],
          result.results.filter((r) => r.status === status).length
        );
      if (metadata.harness.piTaskTimeoutMs !== undefined)
        assert.equal(metadata.harness.piTaskTimeoutMs / 1000, a.timeoutSeconds);
    }
    sources.set(a.callsFile, { ...a, calls });
    calls.forEach((c, i) => {
      const u = index.get(`${a.callsFile}:${i + 1}`);
      assert.ok(u);
      assert.equal(u.taskId, c.taskId);
      assert.equal(u.provider, c.provider);
      assert.equal(u.model, c.model);
      assert.equal(u.thinking, c.thinking);
      assert.equal(u.timeoutSeconds, a.timeoutSeconds);
      if (promptHashes.has(c.taskId))
        assert.equal(
          u.promptSha256,
          promptHashes.get(c.taskId),
          `Prompt drift: ${c.taskId}`
        );
      else promptHashes.set(c.taskId, u.promptSha256);
      assert.deepEqual(u.tokens, c.tokens);
      assert.equal(u.recordedCostUsd, c.cost.totalUsd);
      for (const [field, source] of [
        ["promptSha256", c.prompt],
        ["responseSha256", c.response],
        ["submissionSha256", c.submission],
      ])
        verify(`${a.path}/${source}`, u[field]);
      if (c.responseValidation.status === "error") {
        for (const key of KEYS) assert.equal(c.tokens[key], null);
        assert.equal(c.cost.totalUsd, null);
        assert.equal(u.reportedReasoning, null);
        assert.match(c.error, /Pi task timed out after (5|10) minutes/);
      } else {
        for (const key of KEYS)
          assert.ok(Number.isInteger(c.tokens[key]) && c.tokens[key] >= 0);
        assert.ok(
          typeof c.cost.totalUsd === "number" &&
            Number.isFinite(c.cost.totalUsd) &&
            c.cost.totalUsd >= 0
        );
        assert.equal(
          c.tokens.totalTokens,
          c.tokens.inputTokens +
            c.tokens.outputTokens +
            c.tokens.cacheReadTokens +
            c.tokens.cacheWriteTokens
        );
        if (u.reportedReasoning !== null)
          assert.ok(
            Number.isInteger(u.reportedReasoning) &&
              u.reportedReasoning >= 0 &&
              u.reportedReasoning <= c.tokens.outputTokens
          );
      }
      if (checkRaw) {
        const raw = fs.readFileSync(u.rawFile);
        assert.equal(sha(raw), u.rawSha256);
        if (c.responseValidation.status !== "error") {
          const events = raw
            .toString("utf8")
            .trim()
            .split("\n")
            .map((x) => JSON.parse(x));
          const m = events
            .filter(
              (x) => x.type === "message_end" && x.message?.role === "assistant"
            )
            .at(-1).message;
          assert.equal(m.provider, c.provider);
          assert.equal(m.model, c.model);
          assert.equal(m.thinkingLevel, c.thinking);
          for (const [field, reported] of [
            ["inputTokens", "input"],
            ["outputTokens", "output"],
            ["cacheReadTokens", "cacheRead"],
            ["cacheWriteTokens", "cacheWrite"],
            ["totalTokens", "totalTokens"],
          ])
            assert.equal(m.usage[reported], c.tokens[field]);
          assert.equal(m.usage.cost.total, c.cost.totalUsd);
          assert.equal(m.usage.reasoning ?? null, u.reportedReasoning);
        }
      }
    });
  }
  assert.equal(
    [...sources.values()].reduce((s, a) => s + a.calls.length, 0),
    1325
  );
  assert.equal(usage.filter((u) => u.responseValidation === "error").length, 2);
  const selected = new Set();
  const evaluate = (callsFile, sourceCall, status, point) => {
    const source = sources.get(callsFile),
      c = source.calls[sourceCall - 1];
    const key = `${callsFile}:${sourceCall}`,
      u = index.get(key);
    assert.equal(selected.has(key), false);
    selected.add(key);
    assert.equal(c.provider, point.provider);
    assert.equal(c.model, point.model);
    assert.equal(c.thinking, point.effort);
    assert.notEqual(c.responseValidation.status, "error");
    assert.ok(["passed", "failed", "disallowed", "error"].includes(status));
    return {
      taskId: c.taskId,
      status,
      tokens: c.tokens,
      cost: c.cost.totalUsd,
      reasoning: u.reportedReasoning,
      timeoutSeconds: source.timeoutSeconds,
    };
  };
  const points = manifest.points.map((p) => {
    assert.equal(p.id, `${p.provider}/${p.model}/${p.effort}`);
    assert.ok(
      SERIES.some(
        (s) =>
          s.provider === p.provider &&
          s.model === p.model &&
          s.efforts.includes(p.effort)
      )
    );
    let answers, elapsedMs, executionErrors;
    if (p.source.kind === "trial") {
      const dir = p.source.path;
      for (const [name, field] of [
        ["calls", "callsSha256"],
        ["metadata", "metadataSha256"],
        ["result", "resultSha256"],
        ["execution-envelope", "envelopeSha256"],
      ])
        verify(`${dir}/${name}.json`, p.source[field]);
      const metadata = json(`${dir}/metadata.json`),
        result = json(`${dir}/result.json`),
        envelope = json(`${dir}/execution-envelope.json`);
      assert.deepEqual(metadata.taskSelection, manifest.expectedTaskSelection);
      assert.equal(metadata.pi.version, "1.5.0");
      assert.deepEqual(metadata.model, { id: p.model, provider: p.provider });
      assert.equal(metadata.generation.thinking, p.effort);
      if (metadata.harness.piTaskTimeoutMs)
        assert.equal(
          metadata.harness.piTaskTimeoutMs / 1000,
          sources.get(`${dir}/calls.json`).timeoutSeconds
        );
      if (p.provider === "claude-bridge") {
        assert.equal(metadata.harness.runner, "pi-claude-bridge");
        assert.equal(
          metadata.harness.claudeBridge.sourceDirectorySha256,
          manifest.bridge.sourceDirectorySha256
        );
        assert.deepEqual(metadata.harness.claudeBridge.settingSources, []);
      }
      const calls = sources.get(`${dir}/calls.json`).calls;
      answers = calls.map((c, i) => {
        const grade = result.results.find((r) => r.taskId === c.taskId);
        assert.ok(grade);
        if (grade.status === "error") {
          assert.match(grade.error, /circuit\.json does not exist$/);
          assert.deepEqual(JSON.parse(read(`${dir}/${c.response}`)), {
            operations: [],
          });
          assert.equal(read(`${dir}/${c.submission}`).length, 0);
        }
        return evaluate(`${dir}/calls.json`, i + 1, grade.status, p);
      });
      for (const key of KEYS)
        assert.equal(
          answers.reduce((s, a) => s + a.tokens[key], 0),
          metadata.tokens[key]
        );
      close(
        answers.reduce((s, a) => s + a.cost, 0),
        metadata.cost.totalUsd
      );
      assert.equal(metadata.score.total, 63);
      assert.equal(metadata.score.passed, result.summary.passed);
      close(metadata.score.percent, (result.summary.passed / 63) * 100);
      elapsedMs = envelope.elapsedMs;
      executionErrors = 0;
    } else {
      verify(p.source.path, p.source.sha256);
      const d = json(p.source.path);
      assert.equal(d.nativeResearchTrial, false);
      assert.equal(d.selectedAnswers, 63);
      assert.equal(d.attemptedCalls, 64);
      assert.equal(d.allAttemptOutputTokens, null);
      assert.equal(d.allAttemptCostUsd, null);
      answers = d.answers.map((a) => {
        verify(a.response, a.responseSha256);
        verify(a.gradingResult, a.gradingResultSha256);
        const grade = json(a.gradingResult),
          result = grade.results
            ? grade.results.find((g) => g.taskId === a.taskId)
            : grade;
        assert.equal(result.taskId, a.taskId);
        assert.equal(result.status, a.status);
        const answer = evaluate(a.sourceCalls, a.sourceCall, a.status, p);
        assert.equal(answer.taskId, a.taskId);
        assert.equal(answer.timeoutSeconds, a.timeoutSeconds);
        assert.deepEqual(answer.tokens, a.tokens);
        assert.equal(answer.reasoning, a.reasoning);
        return answer;
      });
      for (const key of KEYS)
        assert.equal(
          answers.reduce((s, a) => s + a.tokens[key], 0),
          d.successfulAnswerTokens[key]
        );
      close(
        answers.reduce((s, a) => s + a.cost, 0),
        d.successfulAnswerCostEstimateUsd ?? d.successfulAnswerRecordedCostUsd
      );
      elapsedMs = d.elapsedMsIncludingTimeout;
      executionErrors = d.historicalExecutionErrors;
      assert.equal(executionErrors, 1);
      for (const status of ["passed", "failed", "disallowed", "error"])
        assert.equal(
          d.summary[status],
          answers.filter((a) => a.status === status).length
        );
      close(d.passRatePercent, (d.summary.passed / 63) * 100);
    }
    assert.equal(answers.length, 63);
    assert.deepEqual(
      answers.map((a) => a.taskId),
      manifest.expectedTaskSelection
    );
    const counts = Object.fromEntries(
      ["passed", "failed", "disallowed", "error"].map((s) => [
        s,
        answers.filter((a) => a.status === s).length,
      ])
    );
    assert.equal(
      Object.values(counts).reduce((a, b) => a + b),
      63
    );
    const tokens = Object.fromEntries(
      KEYS.map((k) => [k, answers.reduce((s, a) => s + a.tokens[k], 0)])
    );
    const timeLimits = {};
    answers.forEach((a) => {
      timeLimits[a.timeoutSeconds] = (timeLimits[a.timeoutSeconds] ?? 0) + 1;
    });
    return {
      ...p,
      counts,
      total: 63,
      passRatePercent: (counts.passed / 63) * 100,
      tokens,
      reasoningReported: answers.every((a) => a.reasoning !== null)
        ? answers.reduce((s, a) => s + a.reasoning, 0)
        : null,
      recordedAnswerCostUsd: answers.reduce((s, a) => s + a.cost, 0),
      allAttemptOutputTokens: p.resumed ? null : tokens.outputTokens,
      allAttemptRecordedCostUsd: p.resumed
        ? null
        : answers.reduce((s, a) => s + a.cost, 0),
      elapsedMs,
      executionErrors,
      timeLimits,
    };
  });
  assert.equal(selected.size, 1323);
  for (const s of SERIES)
    assert.deepEqual(
      points.filter((p) => p.model === s.model).map((p) => p.effort),
      s.efforts
    );
  return {
    schemaVersion: 1,
    manifestSha256: sha(fs.readFileSync(path.resolve(root, manifestPath))),
    selectedAnswers: 1323,
    attemptedCalls: 1325,
    xMetric: "output tokens across 63 selected final answers",
    xScale: "log10",
    yMetric: "passed / 63 * 100",
    caveats: manifest.caveats,
    points,
  };
}

function renderSvg(matrix) {
  const width = 1600,
    height = 1120;
  const plot = { left: 110, right: 1520, top: 200, bottom: 870 };
  const xMin = 2000,
    xMax = 300000,
    yMin = 50,
    yMax = 100;
  const x = (value) =>
    plot.left +
    (Math.log(value / xMin) / Math.log(xMax / xMin)) * (plot.right - plot.left);
  const y = (value) =>
    plot.bottom - ((value - yMin) / (yMax - yMin)) * (plot.bottom - plot.top);
  for (const p of matrix.points)
    assert.ok(
      p.tokens.outputTokens >= xMin &&
        p.tokens.outputTokens <= xMax &&
        p.passRatePercent >= yMin &&
        p.passRatePercent <= yMax
    );
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    "<title>Quantum Katas model-effort matrix</title>",
    `<metadata id="matrix-data">${xml(JSON.stringify({ ...matrix, axes: { x: { min: xMin, max: xMax, scale: "log10", unit: "output tokens / 63 final answers" }, y: { min: yMin, max: yMax, unit: "percent", denominator: 63 } } }))}</metadata>`,
    '<rect width="1600" height="1120" fill="white"/>',
    '<g font-family="DejaVu Sans, sans-serif" fill="#182535">',
    '<text x="80" y="44" font-size="27" font-weight="bold">Quantum Katas: output tokens vs pass rate</text>',
    '<text x="80" y="73" font-size="15">21 conditions, 63 answers each | one observation per effort | 2026-11-04 UTC</text>',
  ];
  SERIES.forEach((s, i) => {
    const lx = i % 2 ? 830 : 110,
      ly = 111 + Math.floor(i / 2) * 32;
    out.push(
      `<path d="M${lx} ${ly - 5}h35" stroke="${s.color}" stroke-width="3"/><circle cx="${lx + 17}" cy="${ly - 5}" r="4" fill="${s.color}"/><text x="${lx + 47}" y="${ly}" font-size="15">${s.provider}/${s.model}</text>`
    );
  });
  for (const v of [50, 60, 70, 80, 90, 100])
    out.push(
      `<path d="M${plot.left} ${y(v)}H${plot.right}" stroke="#dce3e9"/><text x="${plot.left - 18}" y="${y(v) + 5}" text-anchor="end" font-size="15">${v}</text>`
    );
  for (const v of [2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000])
    out.push(
      `<path d="M${x(v)} ${plot.top}V${plot.bottom}" stroke="#edf0f3"/><text x="${x(v)}" y="${plot.bottom + 27}" text-anchor="middle" font-size="14">${v.toLocaleString("en-US")}</text>`
    );
  out.push(
    `<path d="M${plot.left} ${plot.top}V${plot.bottom}H${plot.right}" fill="none" stroke="#526475" stroke-width="1.4"/>`,
    '<text x="815" y="938" text-anchor="middle" font-size="18">Output tokens across 63 final answers (log scale)</text>',
    '<text transform="translate(35 535) rotate(-90)" text-anchor="middle" font-size="18">Pass rate (%) = passed / 63</text>'
  );
  for (const s of SERIES) {
    const regular = matrix.points
      .filter((p) => p.model === s.model && !p.resumed)
      .sort((a, b) => a.tokens.outputTokens - b.tokens.outputTokens);
    out.push(
      `<polyline data-series="${s.model}" data-effort-order="${regular.map((p) => p.effort).join(",")}" points="${regular.map((p) => `${x(p.tokens.outputTokens).toFixed(3)},${y(p.passRatePercent).toFixed(3)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.4" opacity="0.8"/>`
    );
  }
  const positions = matrix.points.map((p) => ({
    ...p,
    px: x(p.tokens.outputTokens),
    py: y(p.passRatePercent),
    color: SERIES.find((s) => s.model === p.model).color,
  }));
  const segments = SERIES.flatMap((s) => {
    const points = positions
      .filter((p) => p.model === s.model && !p.resumed)
      .sort((a, b) => a.px - b.px);
    return points.slice(1).map((p, i) => [points[i], p]);
  });
  // Liang-Barsky clipping: labels must not touch any model's connecting segment.
  const intersects = ([a, b], box) => {
    const dx = b.px - a.px,
      dy = b.py - a.py;
    let enter = 0,
      leave = 1;
    for (const [p, q] of [
      [-dx, a.px - box.x + 3],
      [dx, box.x + box.w + 3 - a.px],
      [-dy, a.py - box.y + 3],
      [dy, box.y + box.h + 3 - a.py],
    ]) {
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const t = q / p;
        if (p < 0) enter = Math.max(enter, t);
        else leave = Math.min(leave, t);
        if (enter > leave) return false;
      }
    }
    return true;
  };
  const labels = [];
  for (const p of [...positions].sort((a, b) => a.py - b.py || a.px - b.px)) {
    const w = p.label.length * 10.5 + 16,
      h = 25;
    let best;
    const candidates = [
      [10, -27],
      [10, 8],
      [-w - 10, -27],
      [-w - 10, 8],
    ];
    for (const r of [35, 50, 70, 95, 125, 160])
      for (let k = 0; k < 16; k++)
        candidates.push([
          Math.cos((k * Math.PI) / 8) * r - w / 2,
          Math.sin((k * Math.PI) / 8) * r - h / 2,
        ]);
    for (const [dx, dy] of candidates) {
      const b = { x: p.px + dx, y: p.py + dy, w, h };
      if (
        b.x < plot.left + 2 ||
        b.x + w > plot.right - 2 ||
        b.y < plot.top + 2 ||
        b.y + h > plot.bottom - 2
      )
        continue;
      const overlap = labels.some(
        (l) =>
          b.x < l.box.x + l.box.w + 4 &&
          b.x + w + 4 > l.box.x &&
          b.y < l.box.y + l.box.h + 3 &&
          b.y + h + 3 > l.box.y
      );
      const marker = positions.some(
        (m) =>
          m.px > b.x - 8 &&
          m.px < b.x + w + 8 &&
          m.py > b.y - 8 &&
          m.py < b.y + h + 8
      );
      const score =
        (overlap ? 100000 : 0) +
        (marker ? 100000 : 0) +
        (segments.some((s) => intersects(s, b)) ? 100000 : 0) +
        Math.hypot(dx + w / 2, dy + h / 2);
      if (!best || score < best.score) best = { score, box: b, point: p };
    }
    assert.ok(
      best && best.score < 100000,
      `No non-overlapping label for ${p.id}`
    );
    labels.push(best);
  }
  for (const l of labels) {
    const p = l.point,
      b = l.box,
      ex = Math.max(b.x, Math.min(p.px, b.x + b.w)),
      ey = Math.max(b.y, Math.min(p.py, b.y + b.h));
    out.push(
      `<path d="M${p.px.toFixed(3)} ${p.py.toFixed(3)}L${ex.toFixed(3)} ${ey.toFixed(3)}" stroke="${p.color}" stroke-width="0.9" opacity="0.65"/>`
    );
  }
  for (const p of positions) {
    out.push(
      `<g data-point-id="${p.id}" data-output-tokens="${p.tokens.outputTokens}" data-pass-rate="${p.passRatePercent}">`
    );
    if (p.resumed)
      out.push(
        `<path d="M${p.px} ${p.py - 7}l7 7-7 7-7-7z" fill="white" stroke="${p.color}" stroke-width="2.5"/>`
      );
    else
      out.push(
        `<circle cx="${p.px.toFixed(3)}" cy="${p.py.toFixed(3)}" r="5" fill="${p.color}" stroke="white" stroke-width="1.2"/>`
      );
    out.push("</g>");
  }
  for (const l of labels)
    out.push(
      `<text x="${l.box.x + 5}" y="${l.box.y + 17}" fill="${l.point.color}" font-size="15" font-weight="bold">${xml(l.point.label)}</text>`
    );
  const notes = [
    "† Luna max: 34 answers at 300s + 29 at 600s. Original timed-out attempt usage is unknown.",
    "‡ Sonnet max: 30 answers at 600s + 33 at 3600s. Original timed-out attempt usage is unknown.",
    "Hollow diamonds show selected-answer subtotals, exclude unknown failed-attempt usage, and are not connected.",
    "Limits: Luna regular 300s; Sol/Sonnet regular 600s; Opus 3600s. Different runners and tokenizers; see report.",
    "Output includes reported reasoning. No confidence bands. Y-axis starts at 50%; x-axis is logarithmic.",
  ];
  notes.forEach((t, i) =>
    out.push(
      `<text x="80" y="${978 + i * 24}" font-size="14" fill="#405366">${xml(t)}</text>`
    )
  );
  out.push("</g></svg>");
  return out.join("\n") + "\n";
}

function fontFiles(root) {
  const lib = path.join(root, ".python-symbolic", "lib");
  const version = fs.readdirSync(lib).find((p) => p.startsWith("python"));
  const fonts = path.join(
    lib,
    version,
    "site-packages/matplotlib/mpl-data/fonts/ttf"
  );
  return ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"].map((f) =>
    path.join(fonts, f)
  );
}
function formatTables(matrix) {
  const number = (n) => (n === null ? "不明" : n.toLocaleString("en-US"));
  let text =
    "# 思考量比較の全結果\n\nこのファイルは保存済み記録から生成した。手動で変更しない。\n\n";
  text +=
    "## 採点と実行時間\n\n| モデル | 思考量 | 回答ごとの上限秒 | 合格 | 不合格 | 不許可 | 採点器エラー | 実行エラー(全試行) | 合格率% | 実行秒 |\n|---|---|---|---:|---:|---:|---:|---:|---:|---:|\n";
  for (const p of matrix.points)
    text += `| ${p.model} | ${p.label} | ${Object.entries(p.timeLimits)
      .map(([s, n]) => `${n}×${s}`)
      .join(
        " + "
      )} | ${p.counts.passed} | ${p.counts.failed} | ${p.counts.disallowed} | ${p.counts.error} | ${p.executionErrors} | ${p.passRatePercent.toFixed(2)} | ${(p.elapsedMs / 1000).toFixed(3)} |\n`;
  text +=
    "\n実行秒は前景の research solve 呼び出しの経過時間。継続した2条件では元の時間切れ待ちも含む。別途の原回答の初回採点、記録照合、指示待ちの時間は含まない。合格率の分母は常に63。\n\n## 利用量と記録料金\n\n| モデル | 思考量 | 入力(キャッシュ除外) | キャッシュ読 | キャッシュ書 | 出力(63回答) | reasoning(出力内数) | Pi記録額USD(回答分) | 全試行出力 | 全試行Pi記録額USD |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n";
  for (const p of matrix.points)
    text += `| ${p.model} | ${p.label} | ${number(p.tokens.inputTokens)} | ${number(p.tokens.cacheReadTokens)} | ${number(p.tokens.cacheWriteTokens)} | ${number(p.tokens.outputTokens)} | ${number(p.reasoningReported)} | ${p.recordedAnswerCostUsd.toFixed(6)} | ${number(p.allAttemptOutputTokens)} | ${p.allAttemptRecordedCostUsd === null ? "不明" : p.allAttemptRecordedCostUsd.toFixed(6)} |\n`;
  return (
    text +
    "\nPi の記録額は請求額ではない。Codex は Pi の価格表による推計。Bridge の0は登録単価が0のためであり、無料や費用の推計を意味しない。reasoning は出力の内数で、二重加算しない。Codex は提供元の内訳欠測も0へ変換するため、記録の0が実際の思考量0とは限らない。† と ‡ は回答の小計であり、時間切れを含む全試行の出力・費用は不明。\n"
  );
}
function renderPng(root, svg) {
  return new Resvg(svg, {
    font: {
      fontFiles: fontFiles(root),
      loadSystemFonts: false,
      defaultFontFamily: "DejaVu Sans",
    },
  })
    .render()
    .asPng();
}
function buildPlotData(root, matrix) {
  return {
    ...matrix,
    fontSha256: fontFiles(root).map((f) => ({
      name: path.basename(f),
      sha256: sha(fs.readFileSync(f)),
    })),
  };
}
function writePlot(root, matrix, output = DEFAULT_OUTPUT) {
  const prefix = path.resolve(root, output);
  fs.mkdirSync(path.dirname(prefix), { recursive: true });
  const svg = renderSvg(matrix);
  const png = renderPng(root, svg);
  fs.writeFileSync(prefix + ".svg", svg);
  fs.writeFileSync(prefix + ".png", png);
  fs.writeFileSync(
    prefix + ".json",
    JSON.stringify(buildPlotData(root, matrix), null, 2) + "\n"
  );
  fs.writeFileSync(
    path.join(root, BASE, "matrix-results.md"),
    formatTables(matrix)
  );
  return {
    svg: prefix + ".svg",
    png: prefix + ".png",
    width: 1600,
    height: 1120,
  };
}
if (require.main === module) {
  const args = process.argv.slice(2),
    root = path.resolve(__dirname, "..");
  assert.ok(
    args.every((x) => ["--check", "--check-raw"].includes(x)),
    "Usage: node scripts/plot_model_effort_matrix.js [--check] [--check-raw]"
  );
  const matrix = loadMatrix(root, DEFAULT_MANIFEST, {
    checkRaw: args.includes("--check-raw"),
  });
  if (!args.includes("--check")) writePlot(root, matrix);
  console.log(
    JSON.stringify({
      conditions: matrix.points.length,
      selectedAnswers: matrix.selectedAnswers,
      attemptedCalls: matrix.attemptedCalls,
      mode: args.includes("--check") ? "check-only" : "generated",
    })
  );
}
module.exports = {
  loadMatrix,
  renderSvg,
  renderPng,
  buildPlotData,
  writePlot,
  formatTables,
  DEFAULT_MANIFEST,
  DEFAULT_OUTPUT,
};
