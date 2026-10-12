import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  chmodSync,
  readdirSync,
  symlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { stringify } from "yaml";
import { writeNeutralCircuitJsonDirectoryAsQniSubmissions } from "../../src/evaluation_runner/neutral_circuit_json_submission";
import { createDispatcher } from "../../src/dispatcher";
import { captureProcessWrites } from "./helpers/command";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  gradeBenchmarkSuite,
  gradeBenchmarkTask,
} from "../../src/evaluation_runner";
import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import {
  parseSymbolicSpecification,
  proveSymbolicSubmission,
} from "../../src/evaluation_runner/symbolic_grading";
import { buildResearchSolveTaskPrompts } from "../../src/research_solve_prompt";

const root = process.cwd();
const context = { cwd: root, projectRoot: root, env: process.env };
const suite = "benchmarks/quantum-katas-symbolic";
const solutions = "benchmarks/solutions/quantum-katas-symbolic";
const ids = [
  "basic-gates/phase-change-pi-over-3",
  "single-qubit-gates/amplitude-change",
  "multi-qubit-gates/controlled-rotation",
  "preparing-states/unequal-superposition",
];
const rational = (a: string, b = "1") => ({ rational: [a, b] });
function answer(id: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(root, solutions, `${id}.json`), "utf8")
  ) as Record<string, unknown>;
}
function grade(id: string, submission: unknown) {
  const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-test-"));
  try {
    const file = path.join(dir, "answer.json");
    writeFileSync(file, JSON.stringify(submission));
    return gradeBenchmarkTask(
      { taskFile: `${suite}/${id}.md`, submissionFile: file },
      context
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function operation(value: Record<string, unknown>): Record<string, unknown> {
  return (value.operations as Record<string, unknown>[])[0];
}
function failed(result: ReturnType<typeof grade>) {
  assert.equal(result.status, "failed");
  assert.equal(result.exitCode, 1);
  assert.equal(result.checks[0].proof?.verdict, "unproven");
}

describe("primary symbolic grading", () => {
  it("proves all four references with explicit protocol and assumptions", () => {
    const result = gradeBenchmarkSuite(
      { benchmarkDir: suite, solutionsDir: solutions },
      context
    );
    assert.deepEqual(result.summary, {
      total: 4,
      passed: 4,
      failed: 0,
      disallowed: 0,
      error: 0,
    });
    for (const item of result.results) {
      assert.equal(item.submissionProtocol, "neutral-symbolic-circuit-json-v1");
      assert.equal(item.checks[0].proof?.verdict, "proved");
      assert.equal(
        item.symbolicAssumptions?.qubits,
        item.taskId?.startsWith("multi-") ? 2 : 1
      );
    }
  });
  for (const id of ids) {
    it(`${id}: rejects fixed-value and wrong-sign answers`, () => {
      const fixed = answer(id);
      operation(fixed).angle = rational("1", "3");
      failed(grade(id, fixed));
      const wrong = answer(id);
      operation(wrong).angle = { neg: operation(wrong).angle };
      failed(grade(id, wrong));
    });
    it(`${id}: rejects undeclared parameters, wrong width, and changed assumptions`, () => {
      const undeclared = answer(id);
      operation(undeclared).angle = { parameter: "beta" };
      failed(grade(id, undeclared));
      const width = answer(id);
      width.qubits = 3;
      failed(grade(id, width));
      const assumptions = answer(id);
      assumptions.parameters = [
        { name: "alpha", real: true, domain: "positive" },
      ];
      failed(grade(id, assumptions));
    });
  }
  it("proves a different decomposition, not just reference AST equality", () => {
    const id = ids[1],
      submission = answer(id);
    const half = { gate: "Ry", targets: [0], angle: { parameter: "alpha" } };
    submission.operations = [half, half];
    assert.equal(grade(id, submission).status, "passed");
  });
  it("accepts global sign for non-strict state preparation", () => {
    const id = ids[3],
      submission = answer(id);
    operation(submission).angle = {
      add: [
        operation(submission).angle,
        { mul: [rational("2"), { pi: true }] },
      ],
    };
    assert.equal(grade(id, submission).status, "passed");
  });
  it("accepts a common unitary global phase and rejects input-dependent phase", () => {
    const id = ids[2],
      submission = answer(id);
    (submission.operations as unknown[]).push({
      gate: "Rx",
      targets: [0],
      angle: { mul: [rational("2"), { pi: true }] },
    });
    assert.equal(grade(id, submission).status, "passed");
    const wrong = answer(id);
    (wrong.operations as unknown[]).push({ gate: "Z", targets: [0] });
    failed(grade(id, wrong));
  });
  it("rejects a global sign in strict unitary grading", () => {
    const id = ids[1],
      submission = answer(id);
    operation(submission).angle = {
      add: [
        operation(submission).angle,
        { mul: [rational("2"), { pi: true }] },
      ],
    };
    failed(grade(id, submission));
  });
  it("state grading does not constrain unobserved input columns", () => {
    const id = ids[3],
      submission = answer(id);
    (submission.operations as unknown[]).unshift({ gate: "Z", targets: [0] });
    assert.equal(grade(id, submission).status, "passed");
  });
  it("handles exact sqrt and all three real inverse trig principal branches", () => {
    const id = ids[0],
      submission = answer(id);
    const rootHalf = { mul: [rational("1", "2"), { sqrt: rational("2") }] };
    operation(submission).angle = {
      add: [
        { parameter: "alpha" },
        { asin: rootHalf },
        { acos: rootHalf },
        { atan: rational("1") },
        { neg: { mul: [rational("3", "4"), { pi: true }] } },
      ],
    };
    assert.equal(grade(id, submission).status, "passed");
  });
  it("requires expressions to be real and defined at every allowed value", () => {
    for (const angle of [
      { sqrt: { parameter: "alpha" } },
      { asin: { parameter: "alpha" } },
      { acos: rational("2") },
    ]) {
      const submission = answer(ids[0]);
      operation(submission).angle = angle;
      failed(grade(ids[0], submission));
    }
  });
  it("never executes expression strings, float coefficients, arbitrary keys, or gates", () => {
    for (const angle of [
      '__import__("os").system("touch /tmp/qni-injection")',
      0.1,
      { eval: "alpha" },
      { rational: ["1", "0"] },
    ]) {
      const submission = answer(ids[0]);
      operation(submission).angle = angle;
      failed(grade(ids[0], submission));
    }
    const submission = answer(ids[0]);
    operation(submission).gate = "Ry";
    failed(grade(ids[0], submission));
    const initial = answer(ids[0]);
    initial.initial_state = "|1>";
    failed(grade(ids[0], initial));
  });
  it("rejects gate control permission widening and invalid indices", () => {
    const id = ids[2];
    for (const controls of [[0, 1], [1], [-1], ["0"]]) {
      const submission = answer(id);
      operation(submission).controls = controls;
      failed(grade(id, submission));
    }
    const submission = answer(id);
    operation(submission).gate = "MCX";
    failed(grade(id, submission));
  });
  it("does not drop tiny exact nonzero coefficients", () => {
    const submission = answer(ids[0]);
    operation(submission).angle = {
      add: [
        { parameter: "alpha" },
        rational("1", "10000000000000000000000000000000"),
      ],
    };
    failed(grade(ids[0], submission));
  });
  it("resource exhaustion is unproven, not a numerical fallback", () => {
    const submission = answer(ids[0]);
    submission.operations = Array.from({ length: 65 }, () =>
      operation(answer(ids[0]))
    );
    failed(grade(ids[0], submission));
  });
  it("bounds reading and rejects devices, FIFOs, oversized files, and missing files", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-files-"));
    const run = (file: string) =>
      gradeBenchmarkTask(
        { taskFile: `${suite}/${ids[0]}.md`, submissionFile: file },
        context
      );
    try {
      const device = path.join(dir, "device.json");
      symlinkSync("/dev/zero", device);
      failed(run(device));
      const fifo = path.join(dir, "fifo.json");
      execFileSync("mkfifo", [fifo], { stdio: "ignore" });
      failed(run(fifo));
      const large = path.join(dir, "large.json");
      writeFileSync(large, " ".repeat(65537));
      failed(run(large));
      const missing = run(path.join(dir, "missing.json"));
      assert.equal(missing.status, "error");
      assert.equal(missing.exitCode, 3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects excessive expression depth and integer size", () => {
    const submission = answer(ids[0]);
    let angle: unknown = { parameter: "alpha" };
    for (let index = 0; index < 18; index++) angle = { neg: angle };
    operation(submission).angle = angle;
    failed(grade(ids[0], submission));
    operation(submission).angle = rational("1".repeat(33));
    failed(grade(ids[0], submission));
    const declaration = answer(ids[0]);
    declaration.parameters = [{ name: "alpha", real: 1, domain: "real" }];
    failed(grade(ids[0], declaration));
  });
  it("runtime absence, permission errors, nonzero exits and invalid responses are errors", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-runtime-"));
    try {
      const bin = path.join(dir, ".python-symbolic", "bin");
      mkdirSync(bin, { recursive: true });
      const file = path.join(dir, "answer.json");
      writeFileSync(file, JSON.stringify(answer(ids[0])));
      const run = () =>
        gradeBenchmarkTask(
          {
            taskFile: path.join(root, suite, `${ids[0]}.md`),
            submissionFile: file,
          },
          { ...context, projectRoot: dir }
        );
      assert.equal(run().status, "error");
      const python = path.join(bin, "python");
      writeFileSync(python, `#!${process.execPath}\nprocess.exit(2);\n`);
      chmodSync(python, 0o644);
      assert.equal(run().status, "error");
      chmodSync(python, 0o755);
      assert.equal(run().status, "error");
      writeFileSync(
        python,
        `#!${process.execPath}\nconsole.log('{"verdict":"guess"}');\n`
      );
      assert.equal(run().status, "error");
      writeFileSync(
        python,
        `#!${process.execPath}\nconsole.log('{"verdict":["proved"],"reason":"invalid type"}');\n`
      );
      assert.equal(run().status, "error");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("bad references and mixed numeric/symbolic task checks are task errors", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-task-"));
    try {
      const task = path.join(dir, "task.md");
      const writeTask = (extra: unknown) =>
        writeFileSync(
          task,
          `---\n${stringify({ id: "test", title: "test", allowed_commands: ["qni add"], available_gates: ["P(angle, target)"], symbolic: loadBenchmarkTask(`${suite}/${ids[0]}.md`).symbolic!, ...(extra as object) })}---\n`
        );
      const file = path.join(dir, "task.json");
      writeFileSync(file, JSON.stringify(answer(ids[0])));
      writeTask({ checks: { tolerance: 0, items: [] } });
      const invalid = gradeBenchmarkTask(
        { taskFile: task, submissionFile: file },
        context
      );
      assert.equal(invalid.status, "error");
      assert.equal(
        invalid.submissionProtocol,
        "neutral-symbolic-circuit-json-v1"
      );
      writeTask({
        symbolic: {
          ...loadBenchmarkTask(`${suite}/${ids[0]}.md`).symbolic!,
          reference: { operations: [{ gate: "bad" }] },
        },
      });
      const referenceError = gradeBenchmarkTask(
        { taskFile: task, submissionFile: file },
        context
      );
      assert.equal(referenceError.status, "error");
      assert.equal(referenceError.error, "invalid symbolic task reference");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("one malformed task preserves other suite rows and symbolic routing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-suite-"));
    try {
      const tasks = path.join(dir, "tasks"),
        submissions = path.join(dir, "submissions");
      mkdirSync(tasks);
      mkdirSync(submissions);
      writeFileSync(
        path.join(tasks, "valid.md"),
        readFileSync(`${suite}/${ids[0]}.md`)
      );
      writeFileSync(
        path.join(submissions, "valid.json"),
        JSON.stringify(answer(ids[0]))
      );
      writeFileSync(
        path.join(tasks, "bad.md"),
        readFileSync(`${suite}/${ids[0]}.md`, "utf8").replace(
          "qubits: 1",
          "qubits: 5"
        )
      );
      const result = gradeBenchmarkSuite(
        { benchmarkDir: tasks, solutionsDir: submissions },
        context
      );
      assert.equal(result.summary.total, 2);
      assert.equal(result.summary.error, 1);
      assert.equal(result.summary.passed, 1);
      assert.equal(
        result.results[0].submissionProtocol,
        "neutral-symbolic-circuit-json-v1"
      );
      assert.match(result.results[0].submission, /bad.json$/u);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("legacy neutral conversion explicitly rejects symbolic tasks", () => {
    assert.throws(
      () =>
        writeNeutralCircuitJsonDirectoryAsQniSubmissions({
          benchmarkDirPath: path.join(root, suite),
          circuitJsonDirPath: path.join(root, solutions),
          outputDirPath: "/unused",
        }),
      /symbolic tasks cannot use/u
    );
  });
  it("parent timeout kills helper and counts as fail", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-proof-timeout-"));
    try {
      const bin = path.join(dir, ".python-symbolic", "bin");
      mkdirSync(bin, { recursive: true });
      const python = path.join(bin, "python");
      writeFileSync(
        python,
        `#!${process.execPath}\nsetTimeout(() => {}, 60000);\n`
      );
      chmodSync(python, 0o755);
      const file = path.join(dir, "answer.json");
      writeFileSync(file, JSON.stringify(answer(ids[0])));
      const specification = loadBenchmarkTask(
        `${suite}/${ids[0]}.md`
      ).symbolic!;
      const check = proveSymbolicSubmission({
        specification,
        submissionPath: file,
        availableGates: ["P(angle, target)"],
        context: { ...context, projectRoot: dir },
      });
      assert.equal(check.status, "failed");
      assert.match(check.proof.reason, /timeout/u);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("validates task domain and excludes numerical grading in symbolic tasks", () => {
    assert.throws(() => parseSymbolicSpecification({}), /invalid symbolic/u);
    assert.throws(
      () =>
        parseSymbolicSpecification({
          ...loadBenchmarkTask(`${suite}/${ids[0]}.md`).symbolic!,
          qubits: 5,
        }),
      /invalid symbolic/u
    );
    assert.throws(
      () =>
        parseSymbolicSpecification({
          ...loadBenchmarkTask(`${suite}/${ids[0]}.md`).symbolic!,
          mode: ["unitary"],
        }),
      /invalid symbolic/u
    );
  });
  it("records external JSON answers under the separate protocol", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-symbolic-record-"));
    try {
      writeFileSync(path.join(dir, "prompt.md"), "symbolic prompt");
      writeFileSync(path.join(dir, "response.md"), "symbolic response");
      const captured = captureProcessWrites(() =>
        createDispatcher({ ...context, cwd: dir }).run([
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
        ])
      );
      assert.equal(captured.value, 0, captured.stderr);
      const runs = path.join(dir, "research", "runs");
      const metadata = JSON.parse(
        readFileSync(
          path.join(runs, readdirSync(runs)[0], "metadata.json"),
          "utf8"
        )
      ) as Record<string, unknown>;
      assert.equal(
        metadata.submissionProtocol,
        "neutral-symbolic-circuit-json-v1"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("cannot accidentally label symbolic model answers with the old research protocol", () => {
    assert.throws(
      () => buildResearchSolveTaskPrompts({ benchmarkDir: suite, context }),
      /symbolic tasks require/u
    );
  });
});
