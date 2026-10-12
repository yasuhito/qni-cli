import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { parse as parseYaml } from "yaml";
import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import {
  gradeBenchmarkTask,
  gradeBenchmarkSuite,
} from "../../src/evaluation_runner/benchmark_grading";
import {
  parseParameterizedProgram,
  expandParameterizedProgram,
  readParameterizedSubmission,
} from "../../src/evaluation_runner/parameterized_circuit";
import { captureDispatcherRun } from "./helpers/command";

const root = process.cwd();
const suite = path.join(root, "benchmarks/quantum-katas-parameterized");
const solutions = path.join(
  root,
  "benchmarks/solutions/quantum-katas-parameterized"
);
const context = { cwd: root, projectRoot: root, env: process.env };
const ids = [
  "basic-gates/two-qubit-gate-3",
  "multi-qubit-gates/arbitrary-controls",
  "preparing-states/all-basis-vectors",
  "preparing-states/all-bell-states",
  "preparing-states/even-odd",
  "preparing-states/parity-bitstrings",
  "preparing-states/two-bitstrings",
  "preparing-states/wstate-arbitrary",
  "preparing-states/wstate-power-of-two",
  "preparing-states/zero-and-bitstring",
  "qft/rotation-gate",
  "superposition/ghz-state",
];
function answer(id: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(solutions, `${id}.json`), "utf8")
  ) as Record<string, unknown>;
}
function grade(id: string, transform: (a: Record<string, unknown>) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-test-"));
  try {
    const a = answer(id);
    transform(a);
    const file = path.join(dir, "answer.json");
    writeFileSync(file, JSON.stringify(a));
    return gradeBenchmarkTask(
      { taskFile: path.join(suite, `${id}.md`), submissionFile: file },
      context
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const ghz = "superposition/ghz-state";
describe("parameterized benchmark contracts", () => {
  for (const id of ids) {
    it(`${id}: reference passes all public and hidden cases`, () => {
      const result = grade(id, () => {});
      assert.equal(result.status, "passed", JSON.stringify(result));
      assert.equal(
        result.submissionProtocol,
        "neutral-parameterized-circuit-json-v1"
      );
      assert.ok(result.gradingCases!.length >= 4);
      assert.ok(
        result.gradingCases!.some((c) => c.caseId.startsWith("hidden_"))
      );
    });
    it(`${id}: wrong answer fails`, () => {
      assert.equal(
        grade(id, (a) => {
          a.body = [];
        }).status,
        "failed"
      );
    });
    it(`${id}: fixed answer cannot cover all graded inputs`, () => {
      const t = loadBenchmarkTask(path.join(suite, `${id}.md`));
      const bindings = t.parameterized!.cases[0].inputs;
      const freeze = (v: unknown): unknown => {
        if (Array.isArray(v)) return v.map(freeze);
        if (typeof v !== "object" || v === null) return v;
        const e = v as Record<string, unknown>;
        if (typeof e.input === "string") {
          const value = bindings[e.input];
          return Array.isArray(value) ? { array: value } : value;
        }
        return Object.fromEntries(
          Object.entries(e).map(([key, item]) => [key, freeze(item)])
        );
      };
      const literal = grade(id, (a) => {
        a.qubits = freeze(a.qubits);
        a.body = freeze(a.body);
      });
      assert.equal(literal.status, "failed");
    });
    it(`${id}: global phase follows upstream contract`, () => {
      const result = grade(id, (a) => {
        (a.body as unknown[]).push({
          gate: "GlobalPhase",
          targets: { array: [0] },
          angle: 0.7,
        });
      });
      assert.equal(
        result.status,
        id === "qft/rotation-gate" ? "failed" : "passed"
      );
    });
  }
  it("run-all preserves all twelve results", () => {
    const result = gradeBenchmarkSuite(
      { benchmarkDir: suite, solutionsDir: solutions },
      context
    );
    assert.deepEqual(result.summary, {
      total: 12,
      passed: 12,
      failed: 0,
      error: 0,
      disallowed: 0,
    });
  });
  it("N=1 boundary cases are present", () => {
    for (const id of [
      ghz,
      "preparing-states/all-basis-vectors",
      "preparing-states/even-odd",
      "preparing-states/parity-bitstrings",
      "preparing-states/wstate-arbitrary",
      "preparing-states/wstate-power-of-two",
      "preparing-states/two-bitstrings",
      "preparing-states/zero-and-bitstring",
    ])
      assert.ok(
        loadBenchmarkTask(
          path.join(suite, `${id}.md`)
        ).parameterized!.cases.some((c) => c.qubits === 1)
      );
  });
  it("advertised discrete edges and adversarial pairs are present", () => {
    const cases = (id: string) =>
      loadBenchmarkTask(path.join(suite, `${id}.md`)).parameterized!.cases;
    assert.ok(cases("qft/rotation-gate").some((c) => c.inputs.k === 0));
    const controlCases = cases("multi-qubit-gates/arbitrary-controls");
    assert.ok(
      controlCases.some(
        (c) =>
          Array.isArray(c.inputs.bits) &&
          c.inputs.bits.length > 1 &&
          c.inputs.bits.every((b) => b === true)
      )
    );
    assert.ok(
      controlCases.some(
        (c) =>
          Array.isArray(c.inputs.bits) &&
          c.inputs.bits.length > 1 &&
          c.inputs.bits.every((b) => b === false)
      )
    );
    assert.ok(
      cases("basic-gates/two-qubit-gate-3").some(
        (c) => (c.inputs.index2 as number) < (c.inputs.n as number) - 1
      )
    );
    assert.ok(
      cases("preparing-states/two-bitstrings").some((c) => {
        const a = c.inputs.a as boolean[],
          b = c.inputs.b as boolean[];
        const diff = a
          .map((v, i) => (v !== b[i] ? i : -1))
          .filter((i) => i >= 0);
        return diff[0] > 0 && diff.length > 1;
      })
    );
  });
  it("rejects swapping with the last wire instead of index2", () => {
    const rewrite = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(rewrite);
      if (typeof v !== "object" || v === null) return v;
      const e = v as Record<string, unknown>;
      if (e.input === "index2") return { sub: [{ input: "n" }, 1] };
      return Object.fromEntries(
        Object.entries(e).map(([key, item]) => [key, rewrite(item)])
      );
    };
    assert.equal(
      grade("basic-gates/two-qubit-gate-3", (a) => {
        a.body = rewrite(a.body);
      }).status,
      "failed"
    );
  });
  it("rejects using wire zero instead of the late distinguishing bit", () => {
    const rewrite = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(rewrite);
      if (typeof v !== "object" || v === null) return v;
      const e = v as Record<string, unknown>;
      if (e.gate === "CNOT") return { ...e, controls: { array: [0] } };
      return Object.fromEntries(
        Object.entries(e).map(([key, item]) => [key, rewrite(item)])
      );
    };
    assert.equal(
      grade("preparing-states/two-bitstrings", (a) => {
        a.body = rewrite(a.body);
      }).status,
      "failed"
    );
  });
  it("rejects arbitrary controls without restoring anti-controls", () => {
    assert.equal(
      grade("multi-qubit-gates/arbitrary-controls", (a) => {
        (a.body as unknown[]).pop();
      }).status,
      "failed"
    );
  });
  it("unitary rejects a phase depending on the input column", () => {
    const id = "basic-gates/two-qubit-gate-3",
      task = loadBenchmarkTask(path.join(suite, `${id}.md`));
    const spec = task.parameterized!;
    const a = answer(id);
    (a.body as unknown[]).push({ gate: "Z", targets: { array: [0] } });
    const p = parseParameterizedProgram(a, spec, [
      ...task.availableGates,
      "Z(target)",
    ]);
    const actual = expandParameterizedProgram(p, spec.cases[0]);
    const { compareReferenceCircuit } =
      require("../../src/evaluation_runner/reference_circuit") as typeof import("../../src/evaluation_runner/reference_circuit");
    assert.equal(
      compareReferenceCircuit(
        actual,
        spec.cases[0].reference!,
        spec.tolerance,
        true
      ).status,
      "failed"
    );
  });
});

describe("restricted language boundaries", () => {
  const bad: [string, (a: Record<string, unknown>) => void][] = [
    [
      "width mismatch",
      (a) => {
        a.qubits = 3;
      },
    ],
    [
      "ancilla",
      (a) => {
        a.qubits = { add: [a.qubits, 1] };
      },
    ],
    [
      "declaration domain change",
      (a) => {
        (a.inputs as { max: number }[])[0].max = 3;
      },
    ],
    [
      "unknown root key",
      (a) => {
        a.eval = "process.exit()";
      },
    ],
    [
      "expression source",
      (a) => {
        a.qubits = "n";
      },
    ],
    [
      "unknown operator",
      (a) => {
        a.qubits = { eval: "n" };
      },
    ],
    [
      "undefined input",
      (a) => {
        a.qubits = { input: "missing" };
      },
    ],
    [
      "noninteger width",
      (a) => {
        a.qubits = 1.5;
      },
    ],
    [
      "nonfinite expression",
      (a) => {
        a.qubits = { div: [1, 0] };
      },
    ],
    [
      "negative sqrt",
      (a) => {
        a.qubits = { sqrt: -1 };
      },
    ],
    [
      "invalid acos",
      (a) => {
        a.qubits = { acos: 2 };
      },
    ],
    [
      "empty loop limit",
      (a) => {
        a.body = [{ for: "i", from: 0, to: 100000, body: [] }];
      },
    ],
    [
      "nested empty loops",
      (a) => {
        a.body = [
          {
            for: "i",
            from: 0,
            to: 1000,
            body: [{ for: "j", from: 0, to: 1000, body: [] }],
          },
        ];
      },
    ],
    [
      "operation limit",
      (a) => {
        a.body = [
          {
            for: "i",
            from: 0,
            to: 1025,
            body: [{ gate: "H", targets: { array: [0] } }],
          },
        ];
      },
    ],
    [
      "undeclared dead branch",
      (a) => {
        a.body = [
          {
            if: false,
            then: [{ gate: "H", targets: { array: [{ var: "missing" }] } }],
          },
        ];
      },
    ],
    [
      "unavailable dead gate",
      (a) => {
        a.body = [
          {
            if: false,
            then: [{ gate: "Ry", targets: { array: [0] }, angle: 1 }],
          },
        ];
      },
    ],
    [
      "array bounds",
      (a) => {
        a.qubits = { at: [{ array: [1] }, 2] };
      },
    ],
    [
      "fractional index",
      (a) => {
        a.body = [{ gate: "H", targets: { array: [0.5] } }];
      },
    ],
    [
      "crossed controls",
      (a) => {
        a.body = [
          { gate: "CNOT", targets: { array: [0] }, controls: { array: [0] } },
        ];
      },
    ],
    [
      "out of range index",
      (a) => {
        a.body = [{ gate: "H", targets: { array: [{ input: "n" }] } }];
      },
    ],
    [
      "wrong gate arity",
      (a) => {
        a.body = [
          { gate: "CNOT", targets: { array: [0] }, controls: { array: [] } },
        ];
      },
    ],
    [
      "unknown operation key",
      (a) => {
        a.body = [
          { gate: "H", targets: { array: [0] }, initial_state: "1|1>" },
        ];
      },
    ],
    [
      "prototype property",
      (a) => {
        a.qubits = JSON.parse('{"__proto__":"x"}') as unknown;
      },
    ],
    [
      "boolean arithmetic",
      (a) => {
        a.qubits = { add: [true, 1] };
      },
    ],
    [
      "variable shadowing",
      (a) => {
        a.body = [{ for: "n", from: 0, to: 1, body: [] }];
      },
    ],
  ];
  for (const [title, mutate] of bad)
    it(title, () => {
      const result = grade(ghz, mutate);
      assert.equal(result.status, "failed", JSON.stringify(result));
      assert.equal(result.exitCode, 1);
    });
  it("syntax depth bound", () => {
    assert.equal(
      grade(ghz, (a) => {
        let e: unknown = 1;
        for (let i = 0; i < 20; i++) e = { neg: e };
        a.qubits = e;
      }).status,
      "failed"
    );
  });
  it("angle serialization preserves tiny and ordinary numeric values", () => {
    const t = loadBenchmarkTask(path.join(suite, `${ghz}.md`));
    for (const angle of [
      4e-16,
      -4e-16,
      1e-7,
      0.12345678901234568,
      Math.PI,
      900000,
      Number.MIN_VALUE,
    ]) {
      const a = answer(ghz);
      a.qubits = 1;
      a.body = [{ gate: "Ry", targets: { array: [0] }, angle }];
      const p = parseParameterizedProgram(a, t.parameterized!, ["Ry(target)"]),
        c = { ...t.parameterized!.cases[0], inputs: { n: 1 }, qubits: 1 };
      const expanded = expandParameterizedProgram(p, c);
      const text = expanded.cols[0][0] as string;
      assert.equal(Number(text.slice(3, -1)), angle);
      assert.equal(text.includes("e"), false);
      if (angle === 0.12345678901234568) {
        const { compareReferenceCircuit } =
          require("../../src/evaluation_runner/reference_circuit") as typeof import("../../src/evaluation_runner/reference_circuit");
        assert.equal(
          compareReferenceCircuit(
            expanded,
            { qubits: 1, cols: [["Ry(0.12345678901234568)"]] },
            0
          ).status,
          "passed"
        );
        assert.equal(
          compareReferenceCircuit(expanded, { qubits: 1, cols: [] }, 0).status,
          "failed"
        );
      }
    }
  });
  it("missing submission is an environment error", () => {
    const result = gradeBenchmarkTask(
      {
        taskFile: path.join(suite, `${ghz}.md`),
        submissionFile: path.join(tmpdir(), "qni-pc-does-not-exist.json"),
      },
      context
    );
    assert.equal(result.status, "error");
    assert.equal(result.exitCode, 3);
  });
  it("hidden mismatches never expose reference details in human output", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-hidden-"));
    try {
      const file = path.join(dir, "answer.json"),
        a = answer(ghz);
      a.body = [];
      writeFileSync(file, JSON.stringify(a));
      const result = captureDispatcherRun(root, [
        "benchmark",
        "run",
        path.join(suite, `${ghz}.md`),
        file,
      ]);
      assert.equal(result.exitStatus, 1);
      const hidden = result.stdout.slice(
        result.stdout.indexOf("case hidden_2")
      );
      assert.ok(hidden.includes("case hidden_3"));
      assert.equal(hidden.includes("expected 0."), false);
      assert.equal(hidden.includes("actual 0."), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("human output retains parse and expansion failure reasons", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-diagnostic-"));
    try {
      const file = path.join(dir, "answer.json");
      writeFileSync(file, "{}");
      assert.match(
        captureDispatcherRun(root, [
          "benchmark",
          "run",
          path.join(suite, `${ghz}.md`),
          file,
        ]).stdout,
        /error: parameterized:/u
      );
      const a = answer(ghz);
      a.qubits = 3;
      writeFileSync(file, JSON.stringify(a));
      assert.match(
        captureDispatcherRun(root, [
          "benchmark",
          "run",
          path.join(suite, `${ghz}.md`),
          file,
        ]).stdout,
        /case hidden_2 error: parameterized: qubit count mismatch/u
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("evaluator can add an undisclosed input without changing submission", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-private-"));
    try {
      const text = readFileSync(path.join(suite, `${ghz}.md`), "utf8"),
        end = text.indexOf("\n---", 4);
      const fm = parseYaml(text.slice(4, end)) as {
        parameterized: { cases: unknown[] };
      };
      const expected = Array.from({ length: 64 }, (_, i) => ({
        real: i === 0 || i === 63 ? Math.SQRT1_2 : 0,
        imaginary: 0,
      }));
      fm.parameterized.cases.push({
        id: "private_extra",
        hidden: true,
        inputs: { n: 6 },
        qubits: 6,
        expected,
      });
      const file = path.join(dir, "task.md");
      writeFileSync(file, `---\n${JSON.stringify(fm)}\n---\nprivate`);
      const result = gradeBenchmarkTask(
        { taskFile: file, submissionFile: path.join(solutions, `${ghz}.json`) },
        context
      );
      assert.equal(result.status, "passed");
      assert.equal(result.gradingCases!.at(-1)!.caseId, "private_extra");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("file read rejects device and oversized regular file", () => {
    assert.throws(() => readParameterizedSubmission("/dev/null"));
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-read-"));
    try {
      const file = path.join(dir, "a.json");
      writeFileSync(file, " ".repeat(65537));
      assert.throws(() => readParameterizedSubmission(file));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("case environments reset and inputs are not leaked", () => {
    const result = grade(ghz, () => {});
    assert.ok(!JSON.stringify(result).includes('"inputs"'));
    assert.deepEqual(
      result.gradingCases!.map((c) => c.status),
      ["passed", "passed", "passed", "passed"]
    );
  });
  it("malformed task is error, not a failed submission", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-task-"));
    try {
      const file = path.join(dir, "task.md");
      writeFileSync(
        file,
        readFileSync(path.join(suite, `${ghz}.md`), "utf8").replace(
          '"tolerance": 1e-09',
          '"tolerance": -1'
        )
      );
      const result = gradeBenchmarkTask(
        { taskFile: file, submissionFile: path.join(solutions, `${ghz}.json`) },
        context
      );
      assert.equal(result.status, "error");
      assert.equal(
        result.submissionProtocol,
        "neutral-parameterized-circuit-json-v1"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("legacy conversion rejects parameterized suite", () => {
    const { writeNeutralCircuitJsonDirectoryAsQniSubmissions } =
      require("../../src/evaluation_runner/neutral_circuit_json_submission") as typeof import("../../src/evaluation_runner/neutral_circuit_json_submission");
    assert.throws(() =>
      writeNeutralCircuitJsonDirectoryAsQniSubmissions({
        benchmarkDirPath: suite,
        circuitJsonDirPath: solutions,
        outputDirPath: "unused",
      })
    );
  });
  it("research record persists a separate protocol", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qni-pc-record-"));
    try {
      writeFileSync(path.join(dir, "prompt.md"), "prompt");
      writeFileSync(path.join(dir, "response.md"), "response");
      const result = await captureDispatcherRun(dir, [
        "research",
        "record",
        "--benchmark",
        suite,
        "--submissions",
        solutions,
        "--prompt",
        "prompt.md",
        "--response",
        "response.md",
        "--collaborator",
        "test",
        "--slug",
        "pc",
      ]);
      assert.equal(result.exitStatus, 0, result.stderr);
      const { readdirSync } = require("node:fs") as typeof import("node:fs");
      const trial = path.join(
        dir,
        "research/runs",
        readdirSync(path.join(dir, "research/runs"))[0]
      );
      const metadata = JSON.parse(
        readFileSync(path.join(trial, "metadata.json"), "utf8")
      ) as Record<string, unknown>;
      assert.equal(
        metadata.submissionProtocol,
        "neutral-parameterized-circuit-json-v1"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("research solve does not route parameterized JSON into legacy conversion", () => {
    const { buildResearchSolveTaskPrompts } =
      require("../../src/research_solve_prompt") as typeof import("../../src/research_solve_prompt");
    assert.throws(
      () => buildResearchSolveTaskPrompts({ benchmarkDir: suite, context }),
      /neutral-parameterized-circuit-json-v1/u
    );
  });
  it("FourBitstrings is not generalized", () => {
    const { existsSync } = require("node:fs") as typeof import("node:fs");
    assert.equal(
      existsSync(path.join(suite, "preparing-states/four-bitstrings.md")),
      false
    );
    assert.equal(
      loadBenchmarkTask(
        path.join(
          root,
          "benchmarks/quantum-katas/preparing-states/four-bitstrings.md"
        )
      ).parameterized,
      undefined
    );
  });
});
