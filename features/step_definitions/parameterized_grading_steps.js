const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { When, Then } = require("@cucumber/cucumber");
const root = path.resolve(__dirname, "../..");
const context = { cwd: root, projectRoot: root, env: process.env };
const tasks = "benchmarks/quantum-katas-parameterized";
const solutions = "benchmarks/solutions/quantum-katas-parameterized";
function ghz(world, transform) {
  const { gradeBenchmarkTask } = require("../../dist/evaluation_runner");
  const answer = JSON.parse(
    fs.readFileSync(
      path.join(root, solutions, "superposition/ghz-state.json"),
      "utf8"
    )
  );
  transform(answer);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qni-pc-step-"));
  try {
    const file = path.join(dir, "answer.json");
    fs.writeFileSync(file, JSON.stringify(answer));
    world.parameterizedResult = gradeBenchmarkTask(
      { taskFile: `${tasks}/superposition/ghz-state.md`, submissionFile: file },
      context
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
When("可変長課題の標準解を一括採点する", function () {
  const { gradeBenchmarkSuite } = require("../../dist/evaluation_runner");
  this.parameterizedResult = gradeBenchmarkSuite(
    { benchmarkDir: tasks, solutionsDir: solutions },
    context
  );
});
Then("可変長課題の十二件は全て合格する", function () {
  assert.deepEqual(this.parameterizedResult.summary, {
    total: 12,
    passed: 12,
    failed: 0,
    disallowed: 0,
    error: 0,
  });
});
When("可変長 GHZ 課題へ全体位相だけ異なる解を提出する", function () {
  ghz(this, (answer) =>
    answer.body.push({
      gate: "GlobalPhase",
      targets: { array: [0] },
      angle: 0.7,
    })
  );
});
When("可変長 GHZ 課題へ固定幅の解を提出する", function () {
  ghz(this, (answer) => {
    answer.qubits = 3;
  });
});
When("可変長 GHZ 課題へ余分な量子ビットを提出する", function () {
  ghz(this, (answer) => {
    answer.qubits = { add: [answer.qubits, 1] };
  });
});
When("可変長 GHZ 課題へ過大な空ループを提出する", function () {
  ghz(this, (answer) =>
    answer.body.push({ for: "j", from: 0, to: 100000, body: [] })
  );
});
Then("可変長課題の採点結果は {word} になる", function (status) {
  assert.equal(this.parameterizedResult.status, status);
});
Then("可変長課題の結果には入力値を含めずケース識別子を保存する", function () {
  const results = this.parameterizedResult.results;
  assert.equal(
    results.every(
      (result) =>
        result.gradingCases.some((c) => c.caseId.startsWith("hidden_")) &&
        !JSON.stringify(result).includes('"inputs"')
    ),
    true
  );
});
