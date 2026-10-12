import assert from "node:assert/strict";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { convertNeutralCircuitJsonToQniSubmission } from "../../src/evaluation_runner/neutral_circuit_json_submission";
import { describe, it } from "node:test";
import { loadBenchmarkTask } from "../../src/evaluation_runner/benchmark_task";
import { parseInitialState } from "../../src/initial_state";
import { Simulator } from "../../src/simulator";
import { captureDispatcherRun, withTempDir } from "./helpers/command";

const slugs = [
  "single-qubit",
  "rotation-gate",
  "binary-fraction-classical",
  "binary-fraction-quantum",
  "binary-fraction-inplace",
  "qft",
  "all-basis-vectors",
  "periodic-state",
  "alternating-amplitudes",
  "all-even-vectors",
  "square-wave",
  "signal-frequency",
];
function reference(slug: string) {
  const check = loadBenchmarkTask(
    path.join("benchmarks/quantum-katas/qft", `${slug}.md`)
  ).checks.items[0];
  assert.equal(check.type, "unitary");
  if (check.type !== "unitary") throw new Error("expected reference circuit");
  return check.referenceCircuit;
}
function close(
  actual: { real: number; imag: number },
  real: number,
  imag: number
) {
  assert.ok(Math.abs(actual.real - real) < 1e-9, `${actual.real} != ${real}`);
  assert.ok(Math.abs(actual.imag - imag) < 1e-9, `${actual.imag} != ${imag}`);
}

describe("QFT fixed kata grading", () => {
  for (const [i, slug] of slugs.entries()) {
    for (const [folder, suffix, expected] of [
      ["solutions", "", "passed"],
      ["incorrect", "-wrong", "failed"],
      [
        i >= 6 ? "solutions" : "incorrect",
        "-global-phase",
        i >= 6 ? "passed" : "failed",
      ],
    ]) {
      it(`${slug}${suffix}: ${expected}`, async () => {
        await withTempDir(async (dir) => {
          const result = captureDispatcherRun(dir, [
            "benchmark",
            "run",
            `benchmarks/quantum-katas/qft/${slug}.md`,
            `benchmarks/${folder}/quantum-katas/qft/${slug}${suffix}.qni`,
            "--json",
          ]);
          const payload = JSON.parse(result.stdout);
          assert.equal(payload.status, expected, result.stdout + result.stderr);
          assert.equal(result.exitStatus, expected === "passed" ? 0 : 1);
        });
      });
    }
  }

  for (const slug of [...slugs.slice(0, 6), "signal-frequency"]) {
    it(`${slug}: reference gates are expressible through neutral JSON`, async () => {
      const taskPath = `benchmarks/quantum-katas/qft/${slug}.md`;
      const task = loadBenchmarkTask(taskPath);
      const operations = reference(slug).cols.map((col) => {
        const swaps = col.flatMap((gate, q) => (gate === "Swap" ? [q] : []));
        if (swaps.length) return { gate: "SWAP", targets: swaps };
        const target = col.findIndex(
          (gate) => typeof gate === "string" && gate !== "•"
        );
        const symbol = String(col[target]);
        const controls = col.flatMap((gate, q) => (gate === "•" ? [q] : []));
        const phase = /^P\((.*)\)$/u.exec(symbol);
        return phase
          ? {
              gate: controls.length ? "ControlledPhase" : "Phase",
              targets: [target],
              controls,
              angle: phase[1],
            }
          : { gate: symbol, targets: [target] };
      });
      const submission = convertNeutralCircuitJsonToQniSubmission({
        availableGates: task.availableGates,
        submissionText: JSON.stringify({ operations }),
      });
      await withTempDir(async (dir) => {
        await writeFile(path.join(dir, "neutral.qni"), submission);
        const result = captureDispatcherRun(dir, [
          "benchmark",
          "run",
          taskPath,
          "neutral.qni",
          "--json",
        ]);
        assert.equal(
          JSON.parse(result.stdout).status,
          "passed",
          result.stdout + result.stderr
        );
        assert.equal(result.exitStatus, 0);
      });
    });
  }

  for (const [slug, suffix] of [
    ["rotation-gate", "negative-angle"],
    ["qft", "missing-swap"],
    ["qft", "input-phase"],
  ]) {
    it(`${slug}-${suffix}: rejects convention mistakes`, async () => {
      await withTempDir(async (dir) => {
        const result = captureDispatcherRun(dir, [
          "benchmark",
          "run",
          `benchmarks/quantum-katas/qft/${slug}.md`,
          `benchmarks/incorrect/quantum-katas/qft/${slug}-${suffix}.qni`,
          "--json",
        ]);
        assert.equal(
          JSON.parse(result.stdout).status,
          "failed",
          result.stdout + result.stderr
        );
        assert.equal(result.exitStatus, 1);
      });
    });
  }
  for (const slug of slugs.slice(6, 11)) {
    it(`${slug}: expected amplitudes agree with the analytic state`, () => {
      const check = loadBenchmarkTask(`benchmarks/quantum-katas/qft/${slug}.md`)
        .checks.items[0];
      assert.equal(check.type, "run");
      if (check.type !== "run") throw new Error("expected state check");
      for (let k = 0; k < 8; k++) {
        const amplitude = check.expected.find(
          (item) => item.basis === `|${k.toString(2).padStart(3, "0")}>`
        )?.amplitude ?? { real: 0, imaginary: 0 };
        let magnitude = 1 / Math.sqrt(8);
        let angle = 0;
        if (slug === "periodic-state") angle = (2 * Math.PI * 5 * k) / 8;
        if (slug === "alternating-amplitudes") angle = Math.PI * (k % 2);
        if (slug === "all-even-vectors") magnitude = k % 2 ? 0 : 0.5;
        if (slug === "square-wave") angle = Math.PI * (Math.floor(k / 2) % 2);
        close(
          { real: amplitude.real, imag: amplitude.imaginary },
          magnitude * Math.cos(angle),
          magnitude * Math.sin(angle)
        );
      }
    });
  }

  // These expectations come from the task equations, not the reference gate sequence.
  for (const slug of slugs.slice(0, 6)) {
    it(`${slug}: every matrix column agrees with the analytic definition`, () => {
      const circuit = reference(slug);
      const n = circuit.qubits;
      for (let input = 0; input < 2 ** n; input++) {
        const actual = new Simulator({
          ...circuit,
          initial_state: parseInitialState(
            `1|${input.toString(2).padStart(n, "0")}>`
          ),
        }).exportPayload().amplitudes;
        for (let output = 0; output < 2 ** n; output++) {
          let magnitude = 0;
          let angle = 0;
          if (slug === "qft") {
            magnitude = 1 / Math.sqrt(8);
            angle = (2 * Math.PI * input * output) / 8;
          } else if (slug === "single-qubit") {
            magnitude = Math.SQRT1_2;
            angle = Math.PI * input * output;
          } else if (slug === "binary-fraction-inplace") {
            if ((input & 3) === (output & 3)) {
              magnitude = Math.SQRT1_2;
              angle = output >= 4 ? (2 * Math.PI * input) / 8 : 0;
            }
          } else if (input === output) {
            magnitude = 1;
            if (slug === "rotation-gate") angle = (input * Math.PI) / 4;
            if (slug === "binary-fraction-classical")
              angle = (input * 5 * Math.PI) / 4;
            if (slug === "binary-fraction-quantum")
              angle = input >= 8 ? (2 * Math.PI * (input & 7)) / 8 : 0;
          }
          close(
            actual[output],
            magnitude * Math.cos(angle),
            magnitude * Math.sin(angle)
          );
        }
      }
    });
  }

  it("inverse QFT decodes all eight analytic periodic inputs (including fixed F=5)", () => {
    const columns = Array.from(
      { length: 8 },
      (_, input) =>
        new Simulator({
          ...reference("signal-frequency"),
          initial_state: parseInitialState(
            `1|${input.toString(2).padStart(3, "0")}>`
          ),
        }).exportPayload().amplitudes
    );
    for (let frequency = 0; frequency < 8; frequency++) {
      for (let output = 0; output < 8; output++) {
        const actual = columns.reduce(
          (sum, column, input) => {
            const angle = (2 * Math.PI * frequency * input) / 8;
            const real = Math.cos(angle) / Math.sqrt(8);
            const imag = Math.sin(angle) / Math.sqrt(8);
            return {
              real:
                sum.real +
                column[output].real * real -
                column[output].imag * imag,
              imag:
                sum.imag +
                column[output].real * imag +
                column[output].imag * real,
            };
          },
          { real: 0, imag: 0 }
        );
        close(actual, output === frequency ? 1 : 0, 0);
      }
    }
  });
});
