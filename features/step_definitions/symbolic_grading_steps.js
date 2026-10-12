const { When, Then } = require("@cucumber/cucumber");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const context = { cwd: root, projectRoot: root, env: process.env };
const suite = "benchmarks/quantum-katas-symbolic";
const solutions = "benchmarks/solutions/quantum-katas-symbolic";

function submit(world, id, change) {
  const { gradeBenchmarkTask } = require("../../dist/evaluation_runner");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qni-symbolic-feature-"));
  try {
    const answer = JSON.parse(
      fs.readFileSync(path.join(root, solutions, `${id}.json`), "utf8")
    );
    change(answer);
    const file = path.join(dir, "answer.json");
    fs.writeFileSync(file, JSON.stringify(answer));
    world.symbolicResult = gradeBenchmarkTask(
      { taskFile: `${suite}/${id}.md`, submissionFile: file },
      context
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
When("記号採点の標準解スイートを実行する", function () {
  const { gradeBenchmarkSuite } = require("../../dist/evaluation_runner");
  this.symbolicResult = gradeBenchmarkSuite(
    { benchmarkDir: suite, solutionsDir: solutions },
    context
  );
});
When("記号採点へ固定角度の解を提出する", function () {
  submit(this, "single-qubit-gates/amplitude-change", (answer) => {
    answer.operations[0].angle = {
      mul: [{ rational: ["1", "3"] }, { pi: true }],
    };
  });
});
When("記号採点へ全体位相だけが異なる状態準備を提出する", function () {
  submit(this, "preparing-states/unequal-superposition", (answer) => {
    answer.operations[0].angle = {
      add: [
        answer.operations[0].angle,
        { mul: [{ rational: ["2", "1"] }, { pi: true }] },
      ],
    };
  });
});
When("記号採点へ入力依存の位相を持つ制御回転を提出する", function () {
  submit(this, "multi-qubit-gates/controlled-rotation", (answer) => {
    answer.operations.push({ gate: "Z", targets: [0] });
  });
});
When("記号採点へ数式文字列を提出する", function () {
  submit(this, "basic-gates/phase-change-pi-over-3", (answer) => {
    answer.operations[0].angle = "alpha";
  });
});
When("記号採点の研究試行を記録する", function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qni-symbolic-record-"));
  try {
    fs.writeFileSync(path.join(dir, "prompt.md"), "symbolic prompt");
    fs.writeFileSync(path.join(dir, "response.md"), "symbolic response");
    execFileSync(
      process.execPath,
      [
        path.join(root, "dist/bin/qni.js"),
        "research",
        "record",
        "--benchmark",
        path.join(root, suite),
        "--submissions",
        path.join(root, solutions),
        "--prompt",
        "prompt.md",
        "--response",
        "response.md",
        "--collaborator",
        "test",
        "--slug",
        "symbolic-test",
      ],
      { cwd: dir, stdio: ["ignore", "pipe", "pipe"], timeout: 60000 }
    );
    const runs = path.join(dir, "research/runs");
    this.symbolicProtocol = JSON.parse(
      fs.readFileSync(
        path.join(runs, fs.readdirSync(runs)[0], "metadata.json"),
        "utf8"
      )
    ).submissionProtocol;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
Then(
  "記号研究試行の提出プロトコルは neutral-symbolic-circuit-json-v1 になる",
  function () {
    assert.equal(this.symbolicProtocol, "neutral-symbolic-circuit-json-v1");
  }
);
Then("記号採点の全6課題が証明済みになる", function () {
  assert.deepEqual(
    this.symbolicResult.results.map((result) => result.checks[0].proof.verdict),
    ["proved", "proved", "proved", "proved", "proved", "proved"]
  );
});
Then("記号採点の結果は未証明の不合格になる", function () {
  assert.equal(this.symbolicResult.checks[0].proof.verdict, "unproven");
});
Then("記号採点の結果は証明済みになる", function () {
  assert.equal(this.symbolicResult.checks[0].proof.verdict, "proved");
});

const inverseIds = [
  "single-qubit-gates/prepare-rotated-state",
  "single-qubit-gates/prepare-arbitrary-state",
];
function submitInverse(world, change) {
  world.inverseResults = inverseIds.map((id) => {
    submit(world, id, change);
    return world.symbolicResult;
  });
}
When("逆三角関数課題の標準解を採点する", function () {
  submitInverse(this, () => {});
});
When("逆三角関数課題へ全体位相だけが異なる解を提出する", function () {
  submitInverse(this, (answer) => {
    answer.operations[0].angle = {
      add: [
        answer.operations[0].angle,
        { mul: [{ rational: ["2", "1"] }, { pi: true }] },
      ],
    };
  });
});
When("逆三角関数課題へ固定値の解を提出する", function () {
  submitInverse(this, (answer) => {
    answer.operations[0].angle = { rational: ["1", "1"] };
  });
});
When("任意状態の記号採点へ asin に置換した解を提出する", function () {
  submit(this, inverseIds[1], (answer) => {
    answer.operations[0].angle = {
      mul: [{ rational: ["2", "1"] }, { asin: { parameter: "alpha" } }],
    };
  });
});
Then("逆三角関数課題の二つの結果は証明済みになる", function () {
  assert.deepEqual(
    this.inverseResults.map((result) => result.status),
    ["passed", "passed"]
  );
});
Then("逆三角関数課題の二つの結果は未証明になる", function () {
  assert.deepEqual(
    this.inverseResults.map((result) => result.checks[0].proof.verdict),
    ["unproven", "unproven"]
  );
});
When("任意状態の記号採点へ正規化振幅の平方根を含む解を提出する", function () {
  submit(this, inverseIds[1], (answer) => {
    const alpha = { parameter: "alpha" };
    const beta = {
      sqrt: {
        add: [{ rational: ["1", "1"] }, { neg: { mul: [alpha, alpha] } }],
      },
    };
    answer.operations[1].angle = {
      add: [answer.operations[1].angle, beta, { neg: beta }],
    };
  });
});
When("任意状態の記号採点へ未定義の平方根を相殺した解を提出する", function () {
  submit(this, inverseIds[1], (answer) => {
    const root = { sqrt: { parameter: "alpha" } };
    answer.operations[1].angle = {
      add: [answer.operations[1].angle, root, { neg: root }],
    };
  });
});
Then(
  "任意状態の記号仮定は alpha の unit-interval と独立した theta の real を含む",
  function () {
    assert.deepEqual(this.inverseResults[1].symbolicAssumptions.parameters, [
      { name: "alpha", real: true, domain: "unit-interval" },
      { name: "theta", real: true, domain: "real" },
    ]);
  }
);
Then("逆三角関数課題の結果は未証明になる", function () {
  assert.equal(this.symbolicResult.checks[0].proof.verdict, "unproven");
});
