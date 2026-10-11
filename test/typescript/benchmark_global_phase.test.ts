import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import { captureDispatcherRun, withTempDir } from "./helpers/command";

type Amplitude = readonly [basis: string, real: number, imaginary: number];

function runCheck(expected: readonly Amplitude[], option: unknown = true) {
  return {
    type: "run",
    ...(option === undefined ? {} : { up_to_global_phase: option }),
    expected: expected.map(([basis, real, imaginary]) => ({
      basis,
      amplitude: { real, imaginary },
    })),
  };
}

function task(check: object, tolerance = 1e-9, explicitCase = false): string {
  const checks = { tolerance, items: [check] };
  return `---\n${JSON.stringify({
    id: "test/global-phase",
    title: "GlobalPhaseTest",
    available_gates: ["H(target)"],
    allowed_commands: ["qni state set", "qni add"],
    ...(explicitCase
      ? { grading_cases: [{ id: "phase", checks }] }
      : { checks }),
  })}\n---\nCompare state vectors.\n`;
}

// X Z X Z applies -I without relying on negative-leading ket shorthand.
function phaseSubmission(state: string, generalPhase = false): string {
  return [
    `qni state set "${state}"`,
    "qni add X --qubit=0 --step=0",
    "qni add Z --qubit=0 --step=1",
    "qni add X --qubit=0 --step=2",
    "qni add Z --qubit=0 --step=3",
    ...(generalPhase ? ["qni add P --angle=π/3 --qubit=0 --step=4"] : []),
    "",
  ].join("\n");
}

describe("global-phase benchmark grading", () => {
  const cases: readonly {
    name: string;
    expected: readonly Amplitude[];
    state: string;
    exitCode: number;
    generalPhase?: boolean;
    option?: boolean;
    omitOption?: boolean;
    tolerance?: number;
    explicitCase?: boolean;
  }[] = [
    {
      name: "accepts a real minus sign",
      expected: [["|0>", 1, 0]],
      state: "1|0>",
      exitCode: 0,
    },
    {
      name: "accepts an imaginary phase",
      expected: [["|1>", 1, 0]],
      state: "1i|1>",
      exitCode: 0,
    },
    {
      name: "accepts a general unit phase",
      expected: [["|1>", 1, 0]],
      state: "1|1>",
      generalPhase: true,
      exitCode: 0,
    },
    {
      name: "aligns complex expected amplitudes",
      expected: [["|1>", 0, 1]],
      state: "1|1>",
      exitCode: 0,
    },
    {
      name: "uses a nonzero sparse reference",
      expected: [
        ["|00>", 0, 0],
        ["|11>", 1, 0],
      ],
      state: "1i|11>",
      exitCode: 0,
    },
    {
      name: "rejects relative phase errors",
      expected: [
        ["|0>", 0.7071067811865476, 0],
        ["|1>", 0.7071067811865476, 0],
      ],
      state: "0.7071067811865476|0> - 0.7071067811865476|1>",
      exitCode: 1,
    },
    {
      name: "does not normalize magnitude errors",
      expected: [["|1>", 0.5, 0]],
      state: "1|1>",
      exitCode: 1,
    },
    {
      name: "rejects a missing reference amplitude",
      expected: [["|1>", 1, 0]],
      state: "|0>",
      exitCode: 1,
    },
    {
      name: "rejects extra basis amplitudes",
      expected: [["|0>", 0.7071067811865476, 0]],
      state: "0.7071067811865476|0> + 0.7071067811865476|1>",
      exitCode: 1,
    },
    {
      name: "handles all-zero expected amplitudes",
      expected: [["|0>", 0, 0]],
      state: "|0>",
      exitCode: 1,
    },
    {
      name: "keeps false strict",
      expected: [["|1>", 1, 0]],
      state: "1|1>",
      option: false,
      exitCode: 1,
    },
    {
      name: "keeps omission strict",
      expected: [["|1>", 1, 0]],
      state: "1|1>",
      omitOption: true,
      exitCode: 1,
    },
    {
      name: "honors loose tolerance after alignment",
      expected: [["|1>", 0.999999999999, 0]],
      state: "1i|1>",
      tolerance: 1e-11,
      exitCode: 0,
    },
    {
      name: "honors tight tolerance after alignment",
      expected: [["|1>", 0.999999999999, 0]],
      state: "1i|1>",
      tolerance: 1e-13,
      exitCode: 1,
    },
    {
      name: "supports opt-in in grading_cases",
      expected: [["|1>", 1, 0]],
      state: "1i|1>",
      explicitCase: true,
      exitCode: 0,
    },
  ];

  for (const example of cases) {
    it(example.name, async () => {
      await withTempDir(async (dir) => {
        const check = runCheck(example.expected, example.option ?? true);
        if (example.omitOption) delete check.up_to_global_phase;
        await writeFile(
          path.join(dir, "task.md"),
          task(check, example.tolerance, example.explicitCase)
        );
        await writeFile(
          path.join(dir, "answer.qni"),
          phaseSubmission(example.state, example.generalPhase)
        );
        const result = captureDispatcherRun(dir, [
          "benchmark",
          "run",
          "task.md",
          "answer.qni",
          "--json",
        ]);
        assert.equal(
          result.exitStatus,
          example.exitCode,
          result.stdout + result.stderr
        );
        assert.equal(result.stderr, "");
        const payload = JSON.parse(result.stdout);
        assert.equal(
          payload.checks[0].status,
          example.exitCode === 0 ? "passed" : "failed"
        );
        if (example.explicitCase)
          assert.equal(payload.gradingCases[0].status, "passed");
      });
    });
  }

  for (const option of ["true", 1, null]) {
    it(`rejects non-boolean phase option ${JSON.stringify(option)}`, async () => {
      await withTempDir(async (dir) => {
        const file = path.join(dir, "task.md");
        await writeFile(file, task(runCheck([["|0>", 1, 0]], option)));
        assert.throws(
          () => loadBenchmarkTask(file),
          /up_to_global_phase must be a boolean/u
        );
      });
    });
  }

  it("rejects phase options on expect checks", async () => {
    await withTempDir(async (dir) => {
      const file = path.join(dir, "task.md");
      await writeFile(
        file,
        task({
          type: "expect",
          up_to_global_phase: false,
          expected: [{ pauli: "Z", value: 1 }],
        })
      );
      assert.throws(
        () => loadBenchmarkTask(file),
        /only supported for run checks/u
      );
    });
  });

  it("opts in exactly the seven existing state-preparation tasks", () => {
    for (const name of [
      "plus-state",
      "minus-state",
      "all-basis-vectors-two-qubits",
      "all-basis-vector-with-phase-flip-two-qubits",
      "all-basis-vectors-with-phases-two-qubits",
      "bell-state",
      "ghz-state",
    ]) {
      const loaded = loadBenchmarkTask(
        path.resolve(`benchmarks/quantum-katas/superposition/${name}.md`)
      );
      for (const check of loaded.checks.items) {
        assert.equal(check.type, "run");
        assert.ok(check.type === "run" && check.upToGlobalPhase === true, name);
      }
    }
  });

  it("displays phase-aligned expected amplitudes on failure", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "task.md"),
        task(runCheck([["|1>", 0.5, 0]]))
      );
      await writeFile(path.join(dir, "answer.qni"), phaseSubmission("1|1>"));
      const result = captureDispatcherRun(dir, [
        "benchmark",
        "run",
        "task.md",
        "answer.qni",
      ]);
      assert.equal(result.exitStatus, 1);
      assert.match(result.stdout, /expected -0\.5, actual -1/u);
    });
  });
});
