import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { gradeBenchmarkSuite } from "../../src/evaluation_runner";
import {
  captureDispatcherRun,
  captureProcessWrites,
  withTempDir,
} from "./helpers/command";

function multiQubitExpectedResults() {
  return [
    { slug: "arbitrary-controls", title: "ArbitraryControls", n: 5 },
    { slug: "compound-gate", title: "CompoundGate", n: 3 },
    { slug: "controlled-rotation", title: "ControlledRotation", n: 2 },
    { slug: "preparing-bell-state", title: "PreparingBellState", n: 0 },
  ].map(({ slug, title, n }) => {
    const caseIds =
      n === 0
        ? ["zero-input"]
        : [
            ...Array.from(
              { length: 2 ** n },
              (_, i) => `basis-${i.toString(2).padStart(n, "0")}`
            ),
            "complex-superposition",
          ];
    return {
      taskId: `multi-qubit-gates/${slug}`,
      title,
      submission: `benchmarks/solutions/quantum-katas/multi-qubit-gates/${slug}.qni`,
      status: "passed",
      exitCode: 0,
      gradingCases: caseIds.map((caseId) => ({
        caseId,
        status: "passed",
        checks: [{ type: "run", status: "passed" }],
      })),
      checks: caseIds.map(() => ({ type: "run", status: "passed" })),
      task: `benchmarks/quantum-katas/multi-qubit-gates/${slug}.md`,
    };
  });
}
const preparingStateResults = [
  ["all-basis-vectors", "AllBasisVectors"],
  ["all-bell-states-0", "AllBellStates0"],
  ["all-bell-states-1", "AllBellStates1"],
  ["all-bell-states-2", "AllBellStates2"],
  ["all-bell-states-3", "AllBellStates3"],
  ["even-odd", "EvenOdd"],
  ["four-bitstrings", "FourBitstrings"],
  ["parity-bitstrings", "ParityBitstrings"],
  ["two-bitstrings", "TwoBitstrings"],
  ["zero-and-bitstring", "ZeroAndBitstring"],
  ["controlled-rotation", "ControlledRotation"],
  ["hardy-state", "HardyState"],
  ["three-states-two-qubits-phases", "ThreeStatesTwoQubitsPhases"],
  ["three-states-two-qubits", "ThreeStatesTwoQubits"],
  ["unequal-superposition", "UnequalSuperposition"],
  ["wstate-arbitrary", "WStateArbitrary"],
  ["wstate-power-of-two", "WStatePowerOfTwo"],
]
  .sort(([a], [b]) =>
    `${a}.md` < `${b}.md` ? -1 : `${a}.md` > `${b}.md` ? 1 : 0
  )
  .map(([slug, title]) => ({
    taskId: `preparing-states/${slug}`,
    title,
    submission: `benchmarks/solutions/quantum-katas/preparing-states/${slug}.qni`,
    status: "passed",
    exitCode: 0,
    checks: [{ type: "run", status: "passed" }],
    task: `benchmarks/quantum-katas/preparing-states/${slug}.md`,
  }));

describe("benchmark command TypeScript route", () => {
  it("classifies invalid task frontmatter as an error result", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: basic-gates/state-flip",
          "title: StateFlip",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "checks:",
          "  tolerance: 1e-9",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n")
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(
        result.stdout,
        "ERROR benchmark run\nerror: allowed_commands is required\n"
      );
      assert.equal(result.stderr, "");
    });
  });

  it("classifies malformed YAML frontmatter as an error result", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: basic-gates/state-flip",
          'title: "StateFlip',
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-9",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n")
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.match(
        result.stdout,
        /^ERROR benchmark run\nerror: invalid YAML frontmatter: Missing closing "quote/mu
      );
      assert.equal(result.stderr, "");
    });
  });

  it("classifies submission syntax errors as error results", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "submission.qni"),
        'qni add X --qubit "0 --step 0\n'
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(
        result.stdout,
        [
          "ERROR StateFlip",
          'error: unterminated quote in command: qni add X --qubit "0 --step 0',
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("classifies qni command execution failures as error results", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit nope --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(
        result.stdout,
        [
          "ERROR StateFlip",
          "error: case zero error: submission command failed at line 1: qni add X --qubit nope --step 0",
          "qubit must be an integer",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("prints the grading case id for grading case command execution errors", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        xOnZeroAndOneGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit nope --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(
        result.stdout,
        [
          "ERROR XOnZeroAndOne",
          "error: case zero-input error: submission command failed at line 1: qni add X --qubit nope --step 0",
          "qubit must be an integer",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("classifies submission lines that do not start with qni as error results", async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, "submission.qni"), "echo not-qni\n");

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 3);
      assert.equal(
        result.stdout,
        [
          "ERROR StateFlip",
          "error: submission command must start with qni at line 1: echo not-qni",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON error status and exit code for qni command execution failures", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit nope --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "submission.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 3);
      assert.equal(payload.status, "error");
      assert.equal(payload.exitCode, 3);
      assert.equal(payload.taskId, "basic-gates/state-flip");
      assert.equal(payload.title, "StateFlip");
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON passed status and exit code for correct submissions", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0);
      assert.deepStrictEqual(payload, {
        taskId: "basic-gates/state-flip",
        title: "StateFlip",
        submission:
          "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
        status: "passed",
        exitCode: 0,
        gradingCases: [
          {
            caseId: "zero",
            status: "passed",
            checks: [{ type: "run", status: "passed" }],
          },
          {
            caseId: "one",
            status: "passed",
            checks: [{ type: "run", status: "passed" }],
          },
          {
            caseId: "real-superposition",
            status: "passed",
            checks: [{ type: "run", status: "passed" }],
          },
          {
            caseId: "complex-superposition",
            status: "passed",
            checks: [{ type: "run", status: "passed" }],
          },
        ],
        checks: [
          { type: "run", status: "passed" },
          { type: "run", status: "passed" },
          { type: "run", status: "passed" },
          { type: "run", status: "passed" },
        ],
      });
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON failed status and exit code for wrong answers", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 1);
      assert.deepStrictEqual(payload, {
        taskId: "basic-gates/state-flip",
        title: "StateFlip",
        submission:
          "benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni",
        status: "failed",
        exitCode: 1,
        gradingCases: [
          {
            caseId: "zero",
            status: "failed",
            checks: [{ type: "run", status: "failed" }],
          },
          {
            caseId: "one",
            status: "failed",
            checks: [{ type: "run", status: "failed" }],
          },
          {
            caseId: "real-superposition",
            status: "failed",
            checks: [{ type: "run", status: "failed" }],
          },
          {
            caseId: "complex-superposition",
            status: "failed",
            checks: [{ type: "run", status: "failed" }],
          },
        ],
        checks: [
          { type: "run", status: "failed" },
          { type: "run", status: "failed" },
          { type: "run", status: "failed" },
          { type: "run", status: "failed" },
        ],
      });
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON disallowed status and exit code for rejected submissions", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 2);
      assert.deepStrictEqual(payload, {
        taskId: "basic-gates/state-flip",
        title: "StateFlip",
        submission:
          "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni",
        status: "disallowed",
        exitCode: 2,
        checks: [],
      });
      assert.equal(result.stderr, "");
    });
  });

  it("rejects submission commands not listed in allowed_commands", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: basic-gates/state-flip",
          "title: StateFlip",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands: # commands students may use",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-9",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n")
      );
      await writeFile(path.join(dir, "submission.qni"), "qni run\n");

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 2, result.stderr);
      assert.equal(
        result.stdout,
        [
          "DISALLOWED StateFlip",
          "rejected: line 1: qni run",
          "allowed commands: qni add",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("preflights the whole submission before executing allowed commands", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: basic-gates/state-flip",
          "title: StateFlip",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:   ",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-9",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n")
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        ["qni add H --qubit nope --step 0", "qni run", ""].join("\n")
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 2, result.stderr);
      assert.equal(
        result.stdout,
        [
          "DISALLOWED StateFlip",
          "rejected: line 2: qni run",
          "allowed commands: qni add",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("uses checks.tolerance from the task file during run checks", async () => {
    await withTempDir(async (dir) => {
      const taskLines = (tolerance: string) =>
        [
          "---",
          "id: numeric/tolerance",
          "title: ToleranceCheck",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          `  tolerance: ${tolerance}`,
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 0.999999999999",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n");
      await writeFile(path.join(dir, "loose.md"), taskLines("1e-11"));
      await writeFile(path.join(dir, "tight.md"), taskLines("1e-13"));
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const loose = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "loose.md",
        "submission.qni",
      ]);
      const tight = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "tight.md",
        "submission.qni",
      ]);

      assert.equal(loose.exitStatus, 0, loose.stderr);
      assert.equal(tight.exitStatus, 1, tight.stderr);
    });
  });

  it("fails instead of aborting when the actual state vector is shorter than expected", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: output/short-actual",
          "title: ShortActual",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-12",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|10>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Prepare a two-qubit state.",
        ].join("\n")
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.ok(result.stdout.includes("FAIL ShortActual\n"));
      assert.ok(result.stdout.includes("  - |10>: expected 1, actual 0\n"));
      assert.equal(result.stderr, "");
    });
  });

  it("passes the PlusState solution using the task tolerance for rounded amplitudes", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/plus-state.md",
        "benchmarks/solutions/quantum-katas/superposition/plus-state.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS PlusState\nchecks: 1\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the BasisChange solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/basis-change.md",
        "benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS BasisChange\nchecks: 2\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the FredkinGate solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/fredkin-gate.md",
        "benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS FredkinGate\nchecks: 10\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the GlobalPhaseChange solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/global-phase-change.md",
        "benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS GlobalPhaseChange\nchecks: 7\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the SignFlip solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/sign-flip.md",
        "benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS SignFlip\nchecks: 2\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the PhaseFlip solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/phase-flip.md",
        "benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS PhaseFlip\nchecks: 2\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the fixed-angle PhaseChange solution using explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md",
        "benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS PhaseChangePiOver3\nchecks: 2\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the MinusState solution using a run check", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/minus-state.md",
        "benchmarks/solutions/quantum-katas/superposition/minus-state.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS MinusState\nchecks: 1\n");
      assert.equal(result.stderr, "");
    });
  });

  it("passes the AllBasisVectors_TwoQubits solution using a run check", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md",
        "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(
        result.stdout,
        "PASS AllBasisVectors_TwoQubits\nchecks: 1\n"
      );
      assert.equal(result.stderr, "");
    });
  });

  it("passes the BellState solution using a run check", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/bell-state.md",
        "benchmarks/solutions/quantum-katas/superposition/bell-state.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS BellState\nchecks: 1\n");
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON run check status for the BellState solution", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/bell-state.md",
        "benchmarks/solutions/quantum-katas/superposition/bell-state.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.deepEqual(payload, {
        taskId: "superposition/bell-state",
        title: "BellState",
        submission:
          "benchmarks/solutions/quantum-katas/superposition/bell-state.qni",
        status: "passed",
        exitCode: 0,
        checks: [{ type: "run", status: "passed" }],
      });
      assert.equal(result.stderr, "");
    });
  });

  it("passes the AllBasisVectorWithPhaseFlip_TwoQubits solution using a run check", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md",
        "benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(
        result.stdout,
        "PASS AllBasisVectorWithPhaseFlip_TwoQubits\nchecks: 1\n"
      );
      assert.equal(result.stderr, "");
    });
  });

  it("passes the AllBasisVectorsWithPhases_TwoQubits solution using a run check", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md",
        "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(
        result.stdout,
        "PASS AllBasisVectorsWithPhases_TwoQubits\nchecks: 1\n"
      );
      assert.equal(result.stderr, "");
    });
  });

  it("uses checks.tolerance from the task file during expect checks", async () => {
    await withTempDir(async (dir) => {
      const taskLines = (tolerance: string) =>
        [
          "---",
          "id: numeric/expect-tolerance",
          "title: ExpectTolerance",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          `  tolerance: ${tolerance}`,
          "  items:",
          "    - type: expect",
          "      expected:",
          "        - pauli: ZZ",
          "          value: 0.999999999999",
          "---",
          "",
          "Prepare a Bell state.",
        ].join("\n");
      await writeFile(path.join(dir, "loose.md"), taskLines("1e-11"));
      await writeFile(path.join(dir, "tight.md"), taskLines("1e-13"));
      await writeFile(
        path.join(dir, "submission.qni"),
        [
          "qni add H --qubit 0 --step 0",
          "qni add X --control 0 --qubit 1 --step 1",
          "",
        ].join("\n")
      );

      const loose = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "loose.md",
        "submission.qni",
      ]);
      const tight = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "tight.md",
        "submission.qni",
      ]);

      assert.equal(loose.exitStatus, 0, loose.stderr);
      assert.equal(tight.exitStatus, 1, tight.stderr);
      assert.ok(tight.stdout.includes("FAIL ExpectTolerance\n"));
      assert.ok(
        tight.stdout.includes(
          "- expect #1: expectation values did not match expected values\n"
        )
      );
    });
  });

  it("fails the StateFlip incorrect sample with human-readable failed check details", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/state-flip.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL StateFlip",
          "checks: 4",
          "failed checks:",
          "- case zero run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 0, actual 0.7071067811865475",
          "  - |1>: expected 1, actual 0.7071067811865475",
          "- case one run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 1, actual 0.7071067811865475",
          "  - |1>: expected 0, actual -0.7071067811865475",
          "- case real-superposition run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 0.8, actual 0.9899494936611664",
          "  - |1>: expected 0.6, actual -0.14142135623730953",
          "- case complex-superposition run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 0.8i, actual 0.42426406871192845+0.565685424949238i",
          "  - |1>: expected 0.6, actual 0.42426406871192845-0.565685424949238i",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("fails the BasisChange zero-input-only incorrect sample in the one-input grading case", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/basis-change.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/basis-change-zero-only.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL BasisChange",
          "checks: 2",
          "failed checks:",
          "- case one-input run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 0.7071067811865476, actual -0.7071067811865475",
          "  - |1>: expected -0.7071067811865476, actual 0.7071067811865475",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("fails the PhaseFlip zero-input-only incorrect sample in the one-input grading case", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/phase-flip.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/phase-flip-zero-only.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL PhaseFlip",
          "checks: 2",
          "failed checks:",
          "- case one-input run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |1>: expected 1i, actual -1",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("fails the FredkinGate unconditional SWAP incorrect sample on basis and superposition inputs", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/fredkin-gate.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL FredkinGate",
          "checks: 10",
          "failed checks:",
          "- case basis-010 run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |001>: expected 0, actual 1",
          "  - |010>: expected 1, actual 0",
          "- case control-zero run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |001>: expected 1, actual 0",
          "  - |010>: expected 0, actual 1",
          "- case control-superposition run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |001>: expected 0.6, actual 0",
          "  - |010>: expected 0, actual 0.6",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("fails the GlobalPhaseChange no-phase incorrect sample on controlled basis and superposition inputs", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "benchmarks/quantum-katas/basic-gates/global-phase-change.md",
        "benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-no-phase.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL GlobalPhaseChange",
          "checks: 7",
          "failed checks:",
          "- case basis-10 run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |10>: expected -1, actual 1",
          "- case basis-11 run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |11>: expected -1, actual 1",
          "- case target-zero run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |10>: expected -0.7071067811865476, actual 0.7071067811865476",
          "- case target-one run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |11>: expected -0.7071067811865476, actual 0.7071067811865476",
          "- case complex-superposition run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |10>: expected -0.5, actual 0.5",
          "  - |11>: expected -0.5i, actual 0.5i",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("prints failed grading case ids in human-readable check details", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        xOnZeroAndOneGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL XOnZeroAndOne",
          "checks: 2",
          "failed checks:",
          "- case one-input run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 0, actual 1",
          "  - |1>: expected 1, actual 0",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("keeps single grading case human-readable check details generic", async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, "task.md"), singleXGradingCaseTask());
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL XOnZero",
          "checks: 1",
          "failed checks:",
          "- run #1: state vector did not match expected amplitudes",
          "  expected / actual mismatches:",
          "  - |0>: expected 1, actual 0",
          "  - |1>: expected 0, actual 1",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON grading case results for explicit grading cases", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        xOnZeroAndOneGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.deepStrictEqual(payload, {
        taskId: "grading-cases/x-on-zero-and-one",
        title: "XOnZeroAndOne",
        submission: "submission.qni",
        status: "failed",
        exitCode: 1,
        gradingCases: [
          {
            caseId: "zero-input",
            status: "passed",
            checks: [{ type: "run", status: "passed" }],
          },
          {
            caseId: "one-input",
            status: "failed",
            checks: [{ type: "run", status: "failed" }],
          },
        ],
        checks: [
          { type: "run", status: "passed" },
          { type: "run", status: "failed" },
        ],
      });
      assert.equal(result.stderr, "");
    });
  });

  it("limits failed check details to mismatched amplitudes that fit human-readable output", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: output/large-failure",
          "title: LargeFailure",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-12",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|00000>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Keep the five-qubit zero state.",
        ].join("\n")
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        [
          "qni add H --qubit 0 --step 0",
          "qni add H --qubit 1 --step 0",
          "qni add H --qubit 2 --step 0",
          "qni add H --qubit 3 --step 0",
          "qni add H --qubit 4 --step 0",
          "",
        ].join("\n")
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);
      const detailLines = result.stdout
        .split("\n")
        .filter((line) => line.startsWith("  - |"));

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(detailLines.length, 16);
      assert.ok(
        result.stdout.includes("  ... 16 more mismatched amplitudes omitted\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("parses scientific notation in imaginary amplitudes during run checks", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        [
          "---",
          "id: numeric/small-rx",
          "title: SmallRx",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-18",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|0>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 0",
          "            imaginary: -1.5707963267948965e-15",
          "---",
          "",
          "Apply a tiny Rx rotation.",
        ].join("\n")
      );
      await writeFile(
        path.join(dir, "submission.qni"),
        "qni add Rx --angle pi/1000000000000000 --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "submission.qni",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(result.stdout, "PASS SmallRx\nchecks: 1\n");
      assert.equal(result.stderr, "");
    });
  });

  it("returns suite grading through a reusable seam without writing the suite output", async () => {
    await withTempDir(async (dir) => {
      const captured = captureProcessWrites(() =>
        gradeBenchmarkSuite(
          {
            benchmarkDir: "benchmarks/quantum-katas",
            solutionsDir: "benchmarks/solutions/quantum-katas",
          },
          {
            cwd: dir,
            env: { PATH: "" },
            projectRoot: process.cwd(),
          }
        )
      );

      assert.equal(captured.stdout, "");
      assert.equal(captured.stderr, "");
      assert.equal(captured.value.status, "passed");
      assert.equal(captured.value.exitCode, 0);
      assert.deepStrictEqual(captured.value.summary, {
        total: 51,
        passed: 51,
        failed: 0,
        disallowed: 0,
        error: 0,
      });
      assert.deepStrictEqual(
        captured.value.results.map((result) => ({
          taskId: result.taskId,
          status: result.status,
          exitCode: result.exitCode,
          checks: result.checks,
        })),
        [
          {
            taskId: "basic-gates/basis-change",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/bell-state-change-1",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "basic-gates/bell-state-change-2",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "basic-gates/bell-state-change-3",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "basic-gates/fredkin-gate",
            status: "passed",
            exitCode: 0,
            checks: Array.from({ length: 10 }, () => ({
              type: "run",
              status: "passed",
            })),
          },
          {
            taskId: "basic-gates/global-phase-change",
            status: "passed",
            exitCode: 0,
            checks: Array.from({ length: 7 }, () => ({
              type: "run",
              status: "passed",
            })),
          },
          {
            taskId: "basic-gates/phase-change-pi-over-3",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/phase-flip",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/sign-flip",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/state-flip",
            status: "passed",
            exitCode: 0,
            checks: Array.from({ length: 4 }, () => ({
              type: "run",
              status: "passed",
            })),
          },
          {
            taskId: "basic-gates/toffoli-gate",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/two-qubit-gate-1",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/two-qubit-gate-2",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/two-qubit-gate-3",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          {
            taskId: "basic-gates/two-qubit-gate-4",
            status: "passed",
            exitCode: 0,
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
              { type: "run", status: "passed" },
            ],
          },
          ...[...multiQubitExpectedResults(), ...preparingStateResults].map(
            ({ taskId, status, exitCode, checks }) => ({
              taskId,
              status,
              exitCode,
              checks,
            })
          ),
          {
            taskId: "single-qubit-gates/amplitude-change",
            status: "passed",
            exitCode: 0,
            checks: Array.from({ length: 3 }, () => ({
              type: "run",
              status: "passed",
            })),
          },
          ...[
            "global-phase-i",
            "prepare-arbitrary-state",
            "prepare-minus",
            "prepare-rotated-state",
            "sign-flip-on-zero",
            "three-quarters-pi-phase",
            "y-gate",
          ].map((slug) => ({
            taskId: `single-qubit-gates/${slug}`,
            status: "passed",
            exitCode: 0,
            checks: Array.from(
              {
                length:
                  slug.startsWith("prepare-") && slug !== "prepare-minus"
                    ? 1
                    : 3,
              },
              () => ({
                type: "run",
                status: "passed",
              })
            ),
          })),
          {
            taskId: "superposition/all-basis-vector-with-phase-flip-two-qubits",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/all-basis-vectors-two-qubits",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/all-basis-vectors-with-phases-two-qubits",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/bell-state",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/ghz-state",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/minus-state",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
          {
            taskId: "superposition/plus-state",
            status: "passed",
            exitCode: 0,
            checks: [{ type: "run", status: "passed" }],
          },
        ]
      );
    });
  });

  it("runs the Quantum Katas smoke benchmark suite", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks/quantum-katas",
        "benchmarks/solutions/quantum-katas",
      ]);

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.equal(
        result.stdout,
        [
          "PASS benchmark suite",
          "tasks: 51",
          "passed: 51, failed: 0, disallowed: 0, error: 0",
          "- passed basic-gates/basis-change BasisChange",
          "- passed basic-gates/bell-state-change-1 BellStateChange1",
          "- passed basic-gates/bell-state-change-2 BellStateChange2",
          "- passed basic-gates/bell-state-change-3 BellStateChange3",
          "- passed basic-gates/fredkin-gate FredkinGate",
          "- passed basic-gates/global-phase-change GlobalPhaseChange",
          "- passed basic-gates/phase-change-pi-over-3 PhaseChangePiOver3",
          "- passed basic-gates/phase-flip PhaseFlip",
          "- passed basic-gates/sign-flip SignFlip",
          "- passed basic-gates/state-flip StateFlip",
          "- passed basic-gates/toffoli-gate ToffoliGate",
          "- passed basic-gates/two-qubit-gate-1 TwoQubitGate1",
          "- passed basic-gates/two-qubit-gate-2 TwoQubitGate2",
          "- passed basic-gates/two-qubit-gate-3 TwoQubitGate3",
          "- passed basic-gates/two-qubit-gate-4 TwoQubitGate4",
          "- passed multi-qubit-gates/arbitrary-controls ArbitraryControls",
          "- passed multi-qubit-gates/compound-gate CompoundGate",
          "- passed multi-qubit-gates/controlled-rotation ControlledRotation",
          "- passed multi-qubit-gates/preparing-bell-state PreparingBellState",
          ...preparingStateResults.map(
            ({ taskId, title }) => `- passed ${taskId} ${title}`
          ),
          "- passed single-qubit-gates/amplitude-change AmplitudeChange",
          "- passed single-qubit-gates/global-phase-i GlobalPhaseI",
          "- passed single-qubit-gates/prepare-arbitrary-state PrepareArbitraryState",
          "- passed single-qubit-gates/prepare-minus PrepareMinus",
          "- passed single-qubit-gates/prepare-rotated-state PrepareRotatedState",
          "- passed single-qubit-gates/sign-flip-on-zero SignFlipOnZero",
          "- passed single-qubit-gates/three-quarters-pi-phase ThreeQuartersPiPhase",
          "- passed single-qubit-gates/y-gate YGate",
          "- passed superposition/all-basis-vector-with-phase-flip-two-qubits AllBasisVectorWithPhaseFlip_TwoQubits",
          "- passed superposition/all-basis-vectors-two-qubits AllBasisVectors_TwoQubits",
          "- passed superposition/all-basis-vectors-with-phases-two-qubits AllBasisVectorsWithPhases_TwoQubits",
          "- passed superposition/bell-state BellState",
          "- passed superposition/ghz-state GHZState",
          "- passed superposition/minus-state MinusState",
          "- passed superposition/plus-state PlusState",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("writes JSON for the Quantum Katas smoke benchmark suite", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks/quantum-katas",
        "benchmarks/solutions/quantum-katas",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 0, result.stderr);
      assert.deepStrictEqual(
        payload,
        JSON.parse(`
{
  "status": "passed",
  "exitCode": 0,
  "summary": {
    "disallowed": 0,
    "error": 0,
    "failed": 0,
    "passed": 51,
    "total": 51
  },
  "results": [
    {
      "taskId": "basic-gates/basis-change",
      "title": "BasisChange",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/basis-change.md"
    },
    {
      "taskId": "basic-gates/bell-state-change-1",
      "title": "BellStateChange1",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "phi-plus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-1.md"
    },
    {
      "taskId": "basic-gates/bell-state-change-2",
      "title": "BellStateChange2",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "phi-plus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-2.md"
    },
    {
      "taskId": "basic-gates/bell-state-change-3",
      "title": "BellStateChange3",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "phi-plus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-3.md"
    },
    {
      "taskId": "basic-gates/fredkin-gate",
      "title": "FredkinGate",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "basis-000",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-010",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-011",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-100",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-110",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-111",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "control-zero",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "control-one",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "control-superposition",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "complex-superposition",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/fredkin-gate.md"
    },
    {
      "taskId": "basic-gates/global-phase-change",
      "title": "GlobalPhaseChange",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "basis-00",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-01",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-10",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "basis-11",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "target-zero",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "target-one",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "complex-superposition",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/global-phase-change.md"
    },
    {
      "taskId": "basic-gates/phase-change-pi-over-3",
      "title": "PhaseChangePiOver3",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md"
    },
    {
      "taskId": "basic-gates/phase-flip",
      "title": "PhaseFlip",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/phase-flip.md"
    },
    {
      "taskId": "basic-gates/sign-flip",
      "title": "SignFlip",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "plus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "minus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/sign-flip.md"
    },
    {
      "taskId": "basic-gates/state-flip",
      "title": "StateFlip",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "real-superposition",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "complex-superposition",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/state-flip.md"
    },
    {
      "taskId": "basic-gates/toffoli-gate",
      "title": "ToffoliGate",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/toffoli-gate.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-zero-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-one-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-one-one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-zero-one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "superposition-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/toffoli-gate.md"
    },
    {
      "taskId": "basic-gates/two-qubit-gate-1",
      "title": "TwoQubitGate1",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-1.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "superposition-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md"
    },
    {
      "taskId": "basic-gates/two-qubit-gate-2",
      "title": "TwoQubitGate2",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-2.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "plus-plus-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "eleven-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "ten-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-2.md"
    },
    {
      "taskId": "basic-gates/two-qubit-gate-3",
      "title": "TwoQubitGate3",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-3.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "zero-one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "superposition-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-3.md"
    },
    {
      "taskId": "basic-gates/two-qubit-gate-4",
      "title": "TwoQubitGate4",
      "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-4.qni",
      "status": "passed",
      "exitCode": 0,
      "gradingCases": [
        {
          "caseId": "zero-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "zero-one-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "one-zero-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        },
        {
          "caseId": "superposition-input",
          "status": "passed",
          "checks": [
            {
              "type": "run",
              "status": "passed"
            }
          ]
        }
      ],
      "checks": [
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        },
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-4.md"
    },
    ${multiQubitExpectedResults()
      .map((result) => JSON.stringify(result))
      .join(",\n")},
    ${preparingStateResults.map((result) => JSON.stringify(result)).join(",\n")},
    {"taskId":"single-qubit-gates/amplitude-change","title":"AmplitudeChange","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/amplitude-change.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/amplitude-change.md"},
    {"taskId":"single-qubit-gates/global-phase-i","title":"GlobalPhaseI","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/global-phase-i.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/global-phase-i.md"},
    {"taskId":"single-qubit-gates/prepare-arbitrary-state","title":"PrepareArbitraryState","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-arbitrary-state.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/prepare-arbitrary-state.md"},
    {"taskId":"single-qubit-gates/prepare-minus","title":"PrepareMinus","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-minus.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/prepare-minus.md"},
    {"taskId":"single-qubit-gates/prepare-rotated-state","title":"PrepareRotatedState","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-rotated-state.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/prepare-rotated-state.md"},
    {"taskId":"single-qubit-gates/sign-flip-on-zero","title":"SignFlipOnZero","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/sign-flip-on-zero.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/sign-flip-on-zero.md"},
    {"taskId":"single-qubit-gates/three-quarters-pi-phase","title":"ThreeQuartersPiPhase","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/three-quarters-pi-phase.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/three-quarters-pi-phase.md"},
    {"taskId":"single-qubit-gates/y-gate","title":"YGate","submission":"benchmarks/solutions/quantum-katas/single-qubit-gates/y-gate.qni","status":"passed","exitCode":0,"gradingCases":[{"caseId":"zero-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"one-input","status":"passed","checks":[{"type":"run","status":"passed"}]},{"caseId":"plus-input","status":"passed","checks":[{"type":"run","status":"passed"}]}],"checks":[{"type":"run","status":"passed"},{"type":"run","status":"passed"},{"type":"run","status":"passed"}],"task":"benchmarks/quantum-katas/single-qubit-gates/y-gate.md"},
    {
      "taskId": "superposition/all-basis-vector-with-phase-flip-two-qubits",
      "title": "AllBasisVectorWithPhaseFlip_TwoQubits",
      "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md"
    },
    {
      "taskId": "superposition/all-basis-vectors-two-qubits",
      "title": "AllBasisVectors_TwoQubits",
      "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md"
    },
    {
      "taskId": "superposition/all-basis-vectors-with-phases-two-qubits",
      "title": "AllBasisVectorsWithPhases_TwoQubits",
      "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md"
    },
    {
      "taskId": "superposition/bell-state",
      "title": "BellState",
      "submission": "benchmarks/solutions/quantum-katas/superposition/bell-state.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/bell-state.md"
    },
    {
      "taskId": "superposition/ghz-state",
      "title": "GHZState",
      "submission": "benchmarks/solutions/quantum-katas/superposition/ghz-state.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/ghz-state.md"
    },
    {
      "taskId": "superposition/minus-state",
      "title": "MinusState",
      "submission": "benchmarks/solutions/quantum-katas/superposition/minus-state.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/minus-state.md"
    },
    {
      "taskId": "superposition/plus-state",
      "title": "PlusState",
      "submission": "benchmarks/solutions/quantum-katas/superposition/plus-state.qni",
      "status": "passed",
      "exitCode": 0,
      "checks": [
        {
          "type": "run",
          "status": "passed"
        }
      ],
      "task": "benchmarks/quantum-katas/superposition/plus-state.md"
    }
  ]
}
      `)
      );
      assert.equal(result.stderr, "");
    });
  });

  it("returns a non-zero suite status when any benchmark task fails", async () => {
    await withTempDir(async (dir) => {
      const benchmarkDir = path.join(dir, "benchmarks");
      const solutionsDir = path.join(dir, "solutions");
      await mkdir(path.join(benchmarkDir, "basic-gates"), { recursive: true });
      await mkdir(path.join(solutionsDir, "basic-gates"), { recursive: true });
      await writeFile(
        path.join(benchmarkDir, "basic-gates", "state-flip.md"),
        [
          "---",
          "id: basic-gates/state-flip",
          "title: StateFlip",
          "source: test",
          "difficulty: smoke",
          "available_gates:",
          "  - X(target)",
          "allowed_commands:",
          "  - qni add",
          "checks:",
          "  tolerance: 1e-9",
          "  items:",
          "    - type: run",
          "      expected:",
          '        - basis: "|1>"',
          "          amplitude:",
          "            real: 1",
          "            imaginary: 0",
          "---",
          "",
          "Flip the state.",
        ].join("\n")
      );
      await writeFile(
        path.join(solutionsDir, "basic-gates", "state-flip.qni"),
        "qni add H --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks",
        "solutions",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL benchmark suite",
          "tasks: 1",
          "passed: 0, failed: 1, disallowed: 0, error: 0",
          "- failed basic-gates/state-flip StateFlip",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("prints failed grading case ids in run-all human-readable task lines", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, "benchmarks", "grading-cases"), {
        recursive: true,
      });
      await mkdir(path.join(dir, "solutions", "grading-cases"), {
        recursive: true,
      });
      await writeFile(
        path.join(dir, "benchmarks", "grading-cases", "x-on-zero-and-one.md"),
        xOnZeroAndOneGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "solutions", "grading-cases", "x-on-zero-and-one.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks",
        "solutions",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL benchmark suite",
          "tasks: 1",
          "passed: 0, failed: 1, disallowed: 0, error: 0",
          "- failed grading-cases/x-on-zero-and-one XOnZeroAndOne",
          "  - case one-input run #1: failed",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("keeps single grading case ids out of run-all human-readable task lines", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, "benchmarks", "grading-cases"), {
        recursive: true,
      });
      await mkdir(path.join(dir, "solutions", "grading-cases"), {
        recursive: true,
      });
      await writeFile(
        path.join(dir, "benchmarks", "grading-cases", "x-on-zero.md"),
        singleXGradingCaseTask()
      );
      await writeFile(
        path.join(dir, "solutions", "grading-cases", "x-on-zero.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks",
        "solutions",
      ]);

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL benchmark suite",
          "tasks: 1",
          "passed: 0, failed: 1, disallowed: 0, error: 0",
          "- failed grading-cases/x-on-zero XOnZero",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("prints grading case error messages in run-all human-readable task lines", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, "benchmarks", "grading-cases"), {
        recursive: true,
      });
      await mkdir(path.join(dir, "solutions", "grading-cases"), {
        recursive: true,
      });
      await writeFile(
        path.join(dir, "benchmarks", "grading-cases", "setup-error.md"),
        setupErrorGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "solutions", "grading-cases", "setup-error.qni"),
        ""
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks",
        "solutions",
      ]);

      assert.equal(result.exitStatus, 3, result.stderr);
      assert.equal(
        result.stdout,
        [
          "FAIL benchmark suite",
          "tasks: 1",
          "passed: 0, failed: 0, disallowed: 0, error: 1",
          "- error grading-cases/setup-error SetupError",
          "  - error: setup command failed in grading case bad-setup: qni state set ",
          "    initial state expression is required",
          "",
        ].join("\n")
      );
      assert.equal(result.stderr, "");
    });
  });

  it("keeps grading case results in run-all JSON without inflating task summary counts", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, "benchmarks", "grading-cases"), {
        recursive: true,
      });
      await mkdir(path.join(dir, "solutions", "grading-cases"), {
        recursive: true,
      });
      await writeFile(
        path.join(dir, "benchmarks", "grading-cases", "x-on-zero-and-one.md"),
        xOnZeroAndOneGradingCasesTask()
      );
      await writeFile(
        path.join(dir, "solutions", "grading-cases", "x-on-zero-and-one.qni"),
        "qni add X --qubit 0 --step 0\n"
      );

      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run-all",
        "benchmarks",
        "solutions",
        "--json",
      ]);
      const payload = JSON.parse(result.stdout) as Record<string, unknown>;

      assert.equal(result.exitStatus, 1, result.stderr);
      assert.deepStrictEqual(payload, {
        status: "failed",
        exitCode: 1,
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          disallowed: 0,
          error: 0,
        },
        results: [
          {
            taskId: "grading-cases/x-on-zero-and-one",
            title: "XOnZeroAndOne",
            task: "benchmarks/grading-cases/x-on-zero-and-one.md",
            submission: "solutions/grading-cases/x-on-zero-and-one.qni",
            status: "failed",
            exitCode: 1,
            gradingCases: [
              {
                caseId: "zero-input",
                status: "passed",
                checks: [{ type: "run", status: "passed" }],
              },
              {
                caseId: "one-input",
                status: "failed",
                checks: [{ type: "run", status: "failed" }],
              },
            ],
            checks: [
              { type: "run", status: "passed" },
              { type: "run", status: "failed" },
            ],
          },
        ],
      });
      assert.equal(result.stderr, "");
    });
  });
});

function xOnZeroAndOneGradingCasesTask(): string {
  return [
    "---",
    "id: grading-cases/x-on-zero-and-one",
    "title: XOnZeroAndOne",
    "source: test",
    "difficulty: smoke",
    "available_gates:",
    "  - X(target)",
    "allowed_commands:",
    "  - qni add",
    "grading_cases:",
    "  - id: zero-input",
    "    checks:",
    "      tolerance: 1e-9",
    "      items:",
    "        - type: run",
    "          expected:",
    '            - basis: "|1>"',
    "              amplitude:",
    "                real: 1",
    "                imaginary: 0",
    "  - id: one-input",
    "    setup_commands:",
    '      - qni state set "|1>"',
    "    checks:",
    "      tolerance: 1e-9",
    "      items:",
    "        - type: run",
    "          expected:",
    '            - basis: "|1>"',
    "              amplitude:",
    "                real: 1",
    "                imaginary: 0",
    "---",
    "",
    "Apply X to both basis inputs.",
  ].join("\n");
}

function singleXGradingCaseTask(): string {
  return [
    "---",
    "id: grading-cases/x-on-zero",
    "title: XOnZero",
    "source: test",
    "difficulty: smoke",
    "available_gates:",
    "  - X(target)",
    "allowed_commands:",
    "  - qni add",
    "grading_cases:",
    "  - id: zero-input",
    "    checks:",
    "      tolerance: 1e-9",
    "      items:",
    "        - type: run",
    "          expected:",
    '            - basis: "|0>"',
    "              amplitude:",
    "                real: 1",
    "                imaginary: 0",
    "---",
    "",
    "Keep zero unchanged.",
  ].join("\n");
}

function setupErrorGradingCasesTask(): string {
  return [
    "---",
    "id: grading-cases/setup-error",
    "title: SetupError",
    "source: test",
    "difficulty: smoke",
    "available_gates:",
    "  - X(target)",
    "allowed_commands:",
    "  - qni add",
    "grading_cases:",
    "  - id: bad-setup",
    "    setup_commands:",
    '      - qni state set ""',
    "    checks:",
    "      tolerance: 1e-9",
    "      items:",
    "        - type: run",
    "          expected:",
    '            - basis: "|0>"',
    "              amplitude:",
    "                real: 1",
    "                imaginary: 0",
    "---",
    "",
    "Setup should fail before checks run.",
  ].join("\n");
}
