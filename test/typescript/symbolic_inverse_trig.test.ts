import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { gradeBenchmarkTask } from "../../src/evaluation_runner";
import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import { parseSymbolicSpecification } from "../../src/evaluation_runner/symbolic_grading";

const root = process.cwd();
const context = { cwd: root, projectRoot: root, env: process.env };
const suite = "benchmarks/quantum-katas-symbolic";
const solutions = "benchmarks/solutions/quantum-katas-symbolic";
const ids = [
  "single-qubit-gates/prepare-rotated-state",
  "single-qubit-gates/prepare-arbitrary-state",
];
type Ast = Record<string, unknown>;
interface Answer {
  protocol: string;
  qubits: number;
  parameters: { name: string; real: boolean; domain: unknown }[];
  operations: { gate: string; targets: number[]; angle?: Ast }[];
}
const rational = (n: string) => ({ rational: [n, "1"] });
const twoPi = { mul: [rational("2"), { pi: true }] };
const alpha = { parameter: "alpha" };
function answer(id: string): Answer {
  return JSON.parse(
    readFileSync(path.join(solutions, `${id}.json`), "utf8")
  ) as Answer;
}
function grade(id: string, submission: Answer) {
  const dir = mkdtempSync(path.join(tmpdir(), "qni-inverse-trig-"));
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
function failed(id: string, submission: Answer) {
  const result = grade(id, submission);
  assert.equal(result.status, "failed");
  assert.equal(result.exitCode, 1);
  assert.equal(result.checks[0].proof?.verdict, "unproven");
}

describe("symbolic inverse-trig state preparation", () => {
  it("independently proves target amplitudes and exact endpoint signs", () => {
    for (const id of ids) {
      const task = loadBenchmarkTask(path.join(root, suite, `${id}.md`));
      const submission = answer(id);
      const code = `
import io, json, runpy, sys
request = json.load(sys.stdin)
sys.stdin = io.StringIO(json.dumps(request))
ns = runpy.run_path('libexec/qni_symbolic_grade.py')
s = ns['s']
interpreter = ns['Interpreter'](request['submission']['parameters'])
actual = interpreter.circuit({'operations': request['submission']['operations']}, 1, request['allowedGates'])[:, 0]
if 'phi' in interpreter.symbols:
    phi = interpreter.symbols['phi']
    expected = s.Matrix([s.cos(phi), -s.I*s.sin(phi)])
    cases = [{phi: x} for x in (0, s.pi/2, s.pi, -s.pi/2)]
else:
    alpha, theta = interpreter.symbols['alpha'], interpreter.symbols['theta']
    expected = s.Matrix([alpha, s.exp(s.I*theta)*s.sqrt(1-alpha**2)])
    cases = [{alpha: a, theta: t} for a in (-1, 0, 1) for t in (0, s.pi/2, s.pi)]
assert all(s.simplify(s.trigsimp(x)) == 0 for x in actual-expected)
for case in cases:
    assert all(s.simplify(x) == 0 for x in actual.subs(case)-expected.subs(case))
`;
      execFileSync(
        path.join(root, ".python-symbolic/bin/python"),
        ["-I", "-B", "-c", code],
        {
          cwd: root,
          input: JSON.stringify({
            specification: task.symbolic,
            submission,
            allowedGates: task.availableGates.map((gate) => gate.split("(")[0]),
          }),
          timeout: 15000,
        }
      );
    }
  });
  for (const id of ids) {
    it(`${id}: proves the reference with strict zero-input assumptions`, () => {
      const result = grade(id, answer(id));
      assert.equal(result.status, "passed");
      assert.equal(result.symbolicAssumptions?.mode, "state");
      assert.equal(result.symbolicAssumptions?.globalPhase, "exact phase");
    });
    it(`${id}: proves split rotations and ignores unused input columns`, () => {
      const submission = answer(id);
      const first = submission.operations[0];
      const factors = first.angle?.mul as Ast[];
      const half = { ...first, angle: factors[1] };
      submission.operations.splice(0, 1, half, half);
      submission.operations.unshift({ gate: "Z", targets: [0] });
      assert.equal(grade(id, submission).status, "passed");
    });
    it(`${id}: rejects fixed values, wrong signs and global sign`, () => {
      for (const angle of [
        rational("1"),
        { neg: answer(id).operations[0].angle },
        { add: [answer(id).operations[0].angle, twoPi] },
      ]) {
        const submission = answer(id);
        submission.operations[0].angle = angle;
        failed(id, submission);
      }
    });
  }
  it("rejects loss of the signed full-circle branch", () => {
    for (const kind of ["asin", "acos"]) {
      const submission = answer(ids[0]);
      submission.operations[0].angle = {
        mul: [
          rational("2"),
          {
            [kind]: { [kind === "asin" ? "sin" : "cos"]: { parameter: "phi" } },
          },
        ],
      };
      failed(ids[0], submission);
    }
    const wrong = answer(ids[0]);
    wrong.operations[0].gate = "Ry";
    failed(ids[0], wrong);
  });
  it("proves acos(alpha) = pi/2 - asin(alpha) with signed alpha", () => {
    const submission = answer(ids[1]);
    submission.operations[0].angle = {
      add: [{ pi: true }, { neg: { mul: [rational("2"), { asin: alpha }] } }],
    };
    assert.equal(grade(ids[1], submission).status, "passed");
  });
  it("rejects wrong principal branch, missing relative phase and Rz-only phase", () => {
    const branch = answer(ids[1]);
    branch.operations[0].angle = { mul: [rational("2"), { asin: alpha }] };
    failed(ids[1], branch);
    const missing = answer(ids[1]);
    missing.operations.pop();
    failed(ids[1], missing);
    const rz = answer(ids[1]);
    rz.operations[1].gate = "Rz";
    failed(ids[1], rz);
  });
  it("proves principal square roots throughout the closed interval", () => {
    const beta = {
      sqrt: { add: [rational("1"), { neg: { mul: [alpha, alpha] } }] },
    };
    const submission = answer(ids[1]);
    // Defined at alpha=-1,0,1 as well; no division by a zero amplitude.
    submission.operations[1].angle = {
      add: [{ parameter: "theta" }, beta, { neg: beta }],
    };
    assert.equal(grade(ids[1], submission).status, "passed");
    const undefinedRoot = answer(ids[1]);
    const root = { sqrt: alpha };
    undefinedRoot.operations[1].angle = {
      add: [{ parameter: "theta" }, root, { neg: root }],
    };
    const result = grade(ids[1], undefinedRoot);
    assert.equal(result.status, "failed");
    assert.match(result.checks[0].proof?.reason ?? "", /sqrt domain/u);
    const undefinedAsin = answer(ids[1]);
    undefinedAsin.operations[0].angle = {
      asin: { add: [alpha, rational("1")] },
    };
    failed(ids[1], undefinedAsin);
  });
  it("does not transfer amplitude bounds to the independent real phase", () => {
    const submission = answer(ids[1]);
    submission.operations[1].angle = { acos: { parameter: "theta" } };
    failed(ids[1], submission);
  });
  it("rejects changed or malformed domain declarations", () => {
    const task = loadBenchmarkTask(path.join(root, suite, `${ids[1]}.md`));
    assert.ok(task.symbolic);
    for (const domain of [
      "real",
      "positive",
      "[0,1]",
      {},
      ["unit-interval"],
      null,
    ]) {
      const submission = answer(ids[1]);
      submission.parameters[0].domain = domain;
      failed(ids[1], submission);
      if (domain !== "real") {
        assert.throws(() =>
          parseSymbolicSpecification({
            ...task.symbolic,
            parameters: submission.parameters,
          })
        );
      }
    }
  });
});
