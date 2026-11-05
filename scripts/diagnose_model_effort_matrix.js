#!/usr/bin/env node
// Fixed, offline diagnostic of the frozen matrix. Never invokes research solve or Pi.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { spawnSync, execFileSync } = require("node:child_process");
const { loadMatrix, DEFAULT_MANIFEST } = require("./plot_model_effort_matrix");
const ROOT = path.resolve(__dirname, "..");
const GRAMMAR = "real-radian-inverse-trig-v1";
const sha = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readJson = (root, file) =>
  JSON.parse(fs.readFileSync(path.join(root, file)));

function originalAnswers(root = ROOT) {
  loadMatrix(root);
  const manifest = readJson(root, DEFAULT_MANIFEST),
    answers = [];
  const callsByFile = new Map();
  const calls = (file) => {
    if (!callsByFile.has(file))
      callsByFile.set(file, readJson(root, file).calls);
    return callsByFile.get(file);
  };
  const add = (point, callsFile, index, status) => {
    const call = calls(callsFile)[index];
    answers.push({
      pointId: point.id,
      provider: point.provider,
      model: point.model,
      effort: point.effort,
      sourceCalls: callsFile,
      sourceCall: index + 1,
      taskId: call.taskId,
      response: path.posix.join(path.posix.dirname(callsFile), call.response),
      oldStatus: status,
      targeted:
        status === "error" ||
        (status === "disallowed" &&
          (call.responseValidation.error ?? "").startsWith("invalid angle")),
    });
  };
  for (const point of manifest.points) {
    if (point.source.kind === "trial") {
      const dir = point.source.path,
        results = readJson(root, dir + "/result.json").results;
      calls(dir + "/calls.json").forEach((call, i) =>
        add(
          point,
          dir + "/calls.json",
          i,
          results.find((r) => r.taskId === call.taskId).status
        )
      );
    } else {
      for (const answer of readJson(root, point.source.path).answers)
        add(point, answer.sourceCalls, answer.sourceCall - 1, answer.status);
    }
  }
  assert.equal(answers.length, 1323);
  assert.equal(answers.filter((a) => a.targeted).length, 81);
  assert.equal(
    new Set(answers.map((a) => `${a.pointId}:${a.taskId}`)).size,
    1323
  );
  return answers;
}

function runDiagnostic(mode, output, root = ROOT) {
  assert(
    ["targeted", "all"].includes(mode),
    "Diagnostic mode must be targeted or all"
  );
  const started = Date.now(),
    git = (...args) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  assert.equal(
    git("status", "--porcelain"),
    "",
    "Commit source before deriving a source-head-labelled diagnostic"
  );
  const head = git("rev-parse", "HEAD");
  assert.equal(
    git("rev-parse", "HEAD:benchmarks/quantum-katas"),
    "c8ed36f52b2ad3d27cc9477696d64d1d333f0594"
  );
  const parent = fs.realpathSync(path.dirname(path.resolve(output))),
    realRoot = fs.realpathSync(root);
  assert(
    parent !== realRoot && !parent.startsWith(realRoot + path.sep),
    "Diagnostic output must stay outside the checkout"
  );
  output = path.join(parent, path.basename(output));
  assert(!fs.existsSync(output), "Never overwrite a previous diagnostic");
  const all = originalAnswers(root),
    answers = mode === "targeted" ? all.filter((a) => a.targeted) : all;
  const { loadBenchmarkTask } = require(
    path.join(root, "dist/evaluation_runner/benchmark_task")
  );
  const {
    convertNeutralCircuitJsonToQniSubmission,
    NeutralCircuitJsonSubmissionError,
  } = require(
    path.join(root, "dist/evaluation_runner/neutral_circuit_json_submission")
  );
  const manifest = readJson(root, DEFAULT_MANIFEST);
  const summary = {
    schemaVersion: 1,
    kind: "offline-original-answer-diagnostic",
    nativeResearchTrial: false,
    equationGrammar: GRAMMAR,
    equationGrammarChanged: true,
    mode,
    sourceHead: head,
    sourceManifest: DEFAULT_MANIFEST,
    sourceManifestSha256: sha(path.join(root, DEFAULT_MANIFEST)),
    originalAttemptedCalls: 1325,
    selectedAnswers: answers.length,
    modelCalls: 0,
    sourceSha256: Object.fromEntries(
      [
        "src/angle_expression.ts",
        "src/evaluation_runner/neutral_circuit_json_submission.ts",
        "src/evaluation_runner/benchmark_grading.ts",
        "src/symbolic_state_renderer.ts",
        "scripts/diagnose_model_effort_matrix.js",
      ].map((f) => [f, sha(path.join(root, f))])
    ),
    compiledSha256: Object.fromEntries(
      [
        "dist/angle_expression.js",
        "dist/evaluation_runner/neutral_circuit_json_submission.js",
        "dist/evaluation_runner/benchmark_grading.js",
      ].map((f) => [f, sha(path.join(root, f))])
    ),
    completed: false,
    internalBudgetMs: 720000,
    perTaskTimeoutMs: 10000,
    results: [],
  };
  fs.mkdirSync(output, { mode: 0o700 });
  const save = (file, value) =>
    fs.writeFileSync(
      path.join(output, file),
      JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" }
    );
  try {
    for (let i = 0; i < answers.length; i++) {
      assert(
        Date.now() - started < summary.internalBudgetMs,
        "Diagnostic time budget exceeded; no automatic continuation"
      );
      assert.equal(
        git("rev-parse", "HEAD"),
        head,
        "Source HEAD changed during diagnostic"
      );
      const answer = answers[i],
        responsePath = path.join(root, answer.response),
        responseSha256 = sha(responsePath);
      const taskFile = path.join(
          root,
          "benchmarks/quantum-katas",
          answer.taskId + ".md"
        ),
        task = loadBenchmarkTask(taskFile);
      assert(
        !task.symbolic && !task.parameterized,
        "This diagnostic covers only the frozen numeric 63 tasks"
      );
      let submission, conversionError;
      try {
        submission = convertNeutralCircuitJsonToQniSubmission({
          availableGates: task.availableGates,
          submissionText: fs.readFileSync(responsePath, "utf8"),
        });
      } catch (error) {
        if (!(error instanceof NeutralCircuitJsonSubmissionError)) throw error;
        conversionError = error.message;
        submission = "qni __invalid-neutral-circuit-json-submission__\n";
      }
      const id = String(i + 1).padStart(4, "0"),
        submissionFile = path.join(output, id + ".qni");
      fs.writeFileSync(submissionFile, submission, { mode: 0o600, flag: "wx" });
      const run = spawnSync(
        process.execPath,
        [
          path.join(root, "dist/bin/qni.js"),
          "benchmark",
          "run",
          taskFile,
          submissionFile,
          "--json",
        ],
        {
          cwd: root,
          encoding: "utf8",
          timeout: summary.perTaskTimeoutMs,
          maxBuffer: 1024 * 1024,
        }
      );
      if (run.error) throw run.error;
      const result = JSON.parse(run.stdout);
      assert.equal(run.status, result.exitCode);
      assert.equal(result.taskId, answer.taskId);
      assert.equal(
        sha(responsePath),
        responseSha256,
        "Original answer changed"
      );
      save(id + ".json", result);
      summary.results.push({
        ...answer,
        responseSha256,
        taskSha256: sha(taskFile),
        conversionError,
        submissionFile: id + ".qni",
        submissionSha256: sha(submissionFile),
        resultFile: id + ".json",
        resultSha256: sha(path.join(output, id + ".json")),
        status: result.status,
      });
      assert.notEqual(
        result.status,
        "error",
        "New grader error; stop and investigate before further diagnostic work"
      );
    }
    loadMatrix(root);
    assert.equal(git("status", "--porcelain"), "", "Original checkout changed");
    summary.completed = true;
  } finally {
    summary.elapsedMs = Date.now() - started;
    summary.counts = Object.fromEntries(
      ["passed", "failed", "disallowed", "error"].map((s) => [
        s,
        summary.results.filter((r) => r.status === s).length,
      ])
    );
    summary.transitions = {};
    for (const r of summary.results) {
      const key = r.oldStatus + "->" + r.status;
      summary.transitions[key] = (summary.transitions[key] ?? 0) + 1;
    }
    summary.points = manifest.points.map((p) => ({
      id: p.id,
      counts: Object.fromEntries(
        ["passed", "failed", "disallowed", "error"].map((s) => [
          s,
          summary.results.filter((r) => r.pointId === p.id && r.status === s)
            .length,
        ])
      ),
    }));
    save("summary.json", summary);
  }
  return summary;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const usage =
    "Usage: node scripts/diagnose_model_effort_matrix.js (--targeted|--all) --out EXISTING_PRIVATE_PARENT/NEW_DIRECTORY\nRun npm run build first. No model calls. Source checkout must be clean.";
  if (args.length === 1 && args[0] === "--help") console.log(usage);
  else {
    assert(
      args.length === 3 &&
        ["--targeted", "--all"].includes(args[0]) &&
        args[1] === "--out",
      usage
    );
    const summary = runDiagnostic(
      args[0] === "--all" ? "all" : "targeted",
      args[2]
    );
    console.log(
      JSON.stringify({
        sourceHead: summary.sourceHead,
        mode: summary.mode,
        answers: summary.results.length,
        counts: summary.counts,
        elapsedMs: summary.elapsedMs,
        modelCalls: 0,
      })
    );
  }
}
module.exports = { originalAnswers, runDiagnostic };
