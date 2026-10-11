import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { captureDispatcherRun, withTempDir } from "./helpers/command";

const cases = [
  { task: "state-flip", count: 4, wrong: ["z-then-x", "x-then-z", "y"] },
  {
    task: "fredkin-gate",
    count: 10,
    wrong: ["untested-basis", "extra-phase", "unconditional-swap"],
  },
  {
    task: "global-phase-change",
    count: 7,
    wrong: [
      "identity",
      "controlled-z",
      "unconditional",
      "wrong-angle",
      "no-phase",
    ],
  },
];

describe("existing Katas strict grading", () => {
  for (const { task, count, wrong } of cases) {
    for (const suffix of [
      "",
      ...(task === "global-phase-change" ? ["-pauli"] : []),
    ]) {
      it(`passes ${task}${suffix} reference on every input`, async () => {
        await withTempDir(async (dir) => {
          const result = captureDispatcherRun(dir, [
            "benchmark",
            "run",
            `benchmarks/quantum-katas/basic-gates/${task}.md`,
            `benchmarks/solutions/quantum-katas/basic-gates/${task}${suffix}.qni`,
            "--json",
          ]);
          const payload = JSON.parse(result.stdout);
          assert.equal(result.exitStatus, 0, result.stderr);
          assert.equal(payload.status, "passed");
          assert.equal(payload.gradingCases.length, count);
          assert.deepStrictEqual(
            payload.checks,
            Array.from({ length: count }, () => ({
              type: "run",
              status: "passed",
            }))
          );
        });
      });
    }
    for (const suffix of wrong) {
      it(`grades ${task}-${suffix} as failed, not disallowed or error`, async () => {
        await withTempDir(async (dir) => {
          const result = captureDispatcherRun(dir, [
            "benchmark",
            "run",
            `benchmarks/quantum-katas/basic-gates/${task}.md`,
            `benchmarks/incorrect/quantum-katas/basic-gates/${task}-${suffix}.qni`,
            "--json",
          ]);
          const payload = JSON.parse(result.stdout);
          assert.equal(result.exitStatus, 1, result.stderr);
          assert.equal(payload.status, "failed");
          assert.equal(payload.exitCode, 1);
          assert.equal(payload.gradingCases.length, count);
          assert.ok(
            payload.gradingCases.some(
              (c: { status: string }) => c.status === "failed"
            )
          );
          assert.ok(
            payload.gradingCases.every(
              (c: { status: string }) =>
                c.status === "passed" || c.status === "failed"
            )
          );
          if (suffix === "z-then-x") {
            assert.deepStrictEqual(
              payload.gradingCases.map(
                (c: { caseId: string; status: string }) => [c.caseId, c.status]
              ),
              [
                ["zero", "passed"],
                ["one", "failed"],
                ["real-superposition", "failed"],
                ["complex-superposition", "failed"],
              ]
            );
          }
          if (suffix === "untested-basis" || suffix === "extra-phase") {
            assert.ok(
              payload.gradingCases
                .filter((c: { caseId: string }) =>
                  ["control-zero", "control-one"].includes(c.caseId)
                )
                .every((c: { status: string }) => c.status === "passed")
            );
          }
        });
      });
    }
  }
});
