import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import type { CircuitData } from "../../src/circuit_file";
import { compareReferenceCircuit } from "../../src/evaluation_runner/reference_circuit";
import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import { parseInitialState } from "../../src/initial_state";
import { captureDispatcherRun, withTempDir } from "./helpers/command";

const identity: CircuitData = { qubits: 1, cols: [] };
const minus: CircuitData = { qubits: 1, cols: [["X"], ["Z"], ["X"], ["Z"]] };
const tolerance = 1e-9;

function task(
  check: object,
  value: unknown = tolerance,
  explicit = false
): string {
  const checks = { tolerance: value, items: [check] };
  return `---\n${JSON.stringify({
    id: "test/reference",
    title: "ReferenceTest",
    available_gates: ["X", "Z"],
    allowed_commands: ["qni add", "qni state set"],
    ...(explicit ? { grading_cases: [{ id: "unitary", checks }] } : { checks }),
  })}\n---\nReference test.\n`;
}

function check(reference: unknown = identity, phase?: unknown) {
  return {
    type: "unitary",
    reference_circuit: reference,
    ...(phase === undefined ? {} : { up_to_global_phase: phase }),
  };
}

describe("reference circuit comparison", () => {
  it("accepts a different implementation", () => {
    assert.equal(
      compareReferenceCircuit(
        { qubits: 1, cols: [["H"], ["H"]] },
        identity,
        tolerance
      ).status,
      "passed"
    );
  });
  it("is strict by default and when explicitly false", () => {
    assert.equal(
      compareReferenceCircuit(minus, identity, tolerance).status,
      "failed"
    );
    assert.equal(
      compareReferenceCircuit(minus, identity, tolerance, false).status,
      "failed"
    );
  });
  it("accepts a common minus phase", () => {
    assert.equal(
      compareReferenceCircuit(minus, identity, tolerance, true).status,
      "passed"
    );
  });
  it("accepts a complex common phase", () => {
    const phase: CircuitData = { qubits: 1, cols: [["X"], ["Y"], ["Z"]] };
    assert.equal(
      compareReferenceCircuit(phase, identity, tolerance, true).status,
      "passed"
    );
    assert.equal(
      compareReferenceCircuit(phase, identity, tolerance).status,
      "failed"
    );
  });
  it("rejects column-dependent phases despite matching |0>", () => {
    assert.equal(
      compareReferenceCircuit(
        { qubits: 1, cols: [["Z"]] },
        identity,
        tolerance,
        true
      ).status,
      "failed"
    );
  });
  it("checks every input and preserves qubit order", () => {
    const forward: CircuitData = { qubits: 2, cols: [["•", "X"]] };
    const backward: CircuitData = { qubits: 2, cols: [["X", "•"]] };
    const result = compareReferenceCircuit(backward, forward, tolerance, true);
    assert.equal(result.status, "failed");
    assert.ok(
      result.mismatches.displayed.some((entry) => entry.input !== "|00>")
    );
  });
  it("reports qubit count mismatch", () => {
    assert.match(
      compareReferenceCircuit({ qubits: 2, cols: [] }, identity, tolerance)
        .reason ?? "",
      /submitted 2, reference 1/u
    );
  });
  it("ignores stored initial state without mutating either circuit", () => {
    const actual = { ...minus, initial_state: parseInitialState("1|1>") };
    const before = JSON.stringify(actual);
    assert.equal(
      compareReferenceCircuit(actual, identity, tolerance, true).status,
      "passed"
    );
    assert.equal(JSON.stringify(actual), before);
    assert.deepEqual(identity, { qubits: 1, cols: [] });
  });
  it("uses componentwise tolerance", () => {
    const s: CircuitData = { qubits: 1, cols: [["S"]] };
    assert.equal(compareReferenceCircuit(s, identity, 1).status, "passed");
    assert.equal(compareReferenceCircuit(s, identity, 0.99).status, "failed");
  });
  it("caps details across the whole matrix", () => {
    const actual: CircuitData = { qubits: 3, cols: [["H", "H", "H"]] };
    const result = compareReferenceCircuit(
      actual,
      { qubits: 3, cols: [] },
      tolerance
    );
    assert.equal(result.mismatches.displayed.length, 16);
    assert.equal(result.mismatches.omittedCount, 48);
  });
  it("handles a zero measured phase pivot", () => {
    assert.equal(
      compareReferenceCircuit(
        identity,
        { qubits: 1, cols: [["X"]] },
        tolerance,
        true
      ).status,
      "failed"
    );
  });
  it("supports numeric angle variables", () => {
    const reference: CircuitData = {
      qubits: 1,
      cols: [["P(theta)"]],
      variables: { theta: "pi/2" },
    };
    assert.equal(
      compareReferenceCircuit(
        { qubits: 1, cols: [["S"]] },
        reference,
        tolerance
      ).status,
      "passed"
    );
  });
  it("accepts a multi-qubit common phase", () => {
    const reference: CircuitData = { qubits: 2, cols: [["H", "S"]] };
    const actual: CircuitData = {
      qubits: 2,
      cols: [...reference.cols, ["X", 1], ["Z", 1], ["X", 1], ["Z", 1]],
    };
    assert.equal(
      compareReferenceCircuit(actual, reference, tolerance, true).status,
      "passed"
    );
  });
  it("accepts the inclusive 8-qubit limit", () => {
    const circuit: CircuitData = { qubits: 8, cols: [] };
    assert.equal(
      compareReferenceCircuit(circuit, circuit, tolerance).status,
      "passed"
    );
  });
  it("validates gates before returning a width mismatch", () => {
    assert.throws(() =>
      compareReferenceCircuit(
        { qubits: 2, cols: [[1, "Rx(theta)"]] },
        identity,
        tolerance
      )
    );
  });
  it("rejects measurement and oversized circuits", () => {
    for (const slot of ["Measure", "Measure>c", "X<c"]) {
      const circuit: CircuitData = { qubits: 1, cols: [[slot]] };
      assert.throws(
        () => compareReferenceCircuit(circuit, identity, tolerance),
        /measurements or classical conditions/u
      );
      assert.throws(
        () => compareReferenceCircuit(identity, circuit, tolerance),
        /measurements or classical conditions/u
      );
    }
    assert.throws(
      () =>
        compareReferenceCircuit({ qubits: 9, cols: [] }, identity, tolerance),
      /1\.\.8/u
    );
  });
});

describe("reference circuit task validation", () => {
  const invalid: readonly [string, object, unknown, RegExp][] = [
    ["missing reference", { type: "unitary" }, tolerance, /reference_circuit/u],
    [
      "wrong columns",
      check({ qubits: 2, cols: [["X"]] }),
      tolerance,
      /exactly qubits/u,
    ],
    [
      "bad width",
      check({ qubits: 0, cols: [] }),
      tolerance,
      /positive integer/u,
    ],
    ["oversized width", check({ qubits: 9, cols: [] }), tolerance, /1\.\.8/u],
    [
      "initial state",
      check({ ...identity, initial_state: null }),
      tolerance,
      /initial_state/u,
    ],
    ["phase flag", check(identity, "true"), tolerance, /boolean/u],
    ["negative tolerance", check(), -1, /finite non-negative/u],
    ["infinite tolerance", check(), "Infinity", /finite non-negative/u],
    ["empty tolerance", check(), "", /finite non-negative/u],
    ["array tolerance", check(), [], /finite non-negative/u],
    [
      "measurement",
      check({ qubits: 1, cols: [["Measure"]] }),
      tolerance,
      /measurements/u,
    ],
    [
      "classical condition",
      check({ qubits: 1, cols: [["X<c"]] }),
      tolerance,
      /classical conditions/u,
    ],
    [
      "unbound angle",
      check({ qubits: 1, cols: [["P(theta)"]] }),
      tolerance,
      /theta/u,
    ],
    [
      "invalid gate",
      check({ qubits: 1, cols: [["INVALID"]] }),
      tolerance,
      /gate/u,
    ],
  ];
  for (const [name, item, value, error] of invalid) {
    it(`rejects ${name}`, async () => {
      await withTempDir(async (cwd) => {
        const file = path.join(cwd, "task.md");
        await writeFile(file, task(item, value));
        assert.throws(() => loadBenchmarkTask(file), error);
      });
    });
  }
});

describe("reference circuit grading integration", () => {
  it("reports a submitted measurement as an error", async () => {
    await withTempDir(async (cwd) => {
      await writeFile(path.join(cwd, "task.md"), task(check()));
      await writeFile(
        path.join(cwd, "solution.qni"),
        "qni add Measure --qubit=0 --step=0\n"
      );
      const result = captureDispatcherRun(cwd, [
        "benchmark",
        "run",
        "task.md",
        "solution.qni",
        "--json",
      ]);
      assert.equal(result.exitStatus, 3);
      assert.match(
        JSON.parse(result.stdout).error,
        /must not contain measurements/u
      );
    });
  });
  it("includes setup commands in the compared final circuit", async () => {
    await withTempDir(async (cwd) => {
      const definition = JSON.parse(
        task(check(), tolerance, true).split("\n")[1]
      );
      definition.grading_cases[0].setup_commands = [
        "qni add X --qubit=0 --step=0",
      ];
      await writeFile(
        path.join(cwd, "task.md"),
        `---\n${JSON.stringify(definition)}\n---\nSetup test.\n`
      );
      await writeFile(
        path.join(cwd, "solution.qni"),
        "qni add X --qubit=0 --step=1\n"
      );
      const result = captureDispatcherRun(cwd, [
        "benchmark",
        "run",
        "task.md",
        "solution.qni",
        "--json",
      ]);
      assert.equal(result.exitStatus, 0);
    });
  });
  for (const explicit of [false, true]) {
    it(`returns unitary JSON summaries (${explicit ? "explicit" : "implicit"} case)`, async () => {
      await withTempDir(async (cwd) => {
        await writeFile(
          path.join(cwd, "task.md"),
          task(check(identity, true), tolerance, explicit)
        );
        await writeFile(
          path.join(cwd, "solution.qni"),
          "qni add X --qubit=0 --step=0\nqni add Z --qubit=0 --step=1\nqni add X --qubit=0 --step=2\nqni add Z --qubit=0 --step=3\n"
        );
        const result = captureDispatcherRun(cwd, [
          "benchmark",
          "run",
          "task.md",
          "solution.qni",
          "--json",
        ]);
        assert.equal(result.exitStatus, 0);
        const payload = JSON.parse(result.stdout);
        assert.deepEqual(payload.checks, [
          { status: "passed", type: "unitary" },
        ]);
        if (explicit) assert.equal(payload.gradingCases[0].caseId, "unitary");
      });
    });
  }
  it("shows input/output mismatch diagnostics", async () => {
    await withTempDir(async (cwd) => {
      await writeFile(path.join(cwd, "task.md"), task(check(identity, true)));
      await writeFile(
        path.join(cwd, "solution.qni"),
        "qni add Z --qubit=0 --step=0\n"
      );
      const result = captureDispatcherRun(cwd, [
        "benchmark",
        "run",
        "task.md",
        "solution.qni",
      ]);
      assert.equal(result.exitStatus, 1);
      assert.match(result.stdout, /input \|1>, output \|1>/u);
    });
  });
});
