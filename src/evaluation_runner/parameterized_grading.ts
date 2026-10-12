import { Simulator } from "../simulator";
import type {
  BenchmarkResult,
  BenchmarkGradingCaseResult,
  BenchmarkCheckResult,
} from "./benchmark_grading";
import type { BenchmarkTask } from "./benchmark_task";
import { compareReferenceCircuit } from "./reference_circuit";
import {
  readParameterizedSubmission,
  parseParameterizedProgram,
  expandParameterizedProgram,
} from "./parameterized_circuit";

/** Each case receives a fresh environment and a circuit with exact declared width. */
export function gradeParameterizedSubmission(
  task: BenchmarkTask,
  submissionPath: string
): BenchmarkResult {
  const spec = task.parameterized!;
  let program: ReturnType<typeof parseParameterizedProgram>;
  try {
    program = parseParameterizedProgram(
      readParameterizedSubmission(submissionPath),
      spec,
      task.availableGates
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw error;
    return {
      submissionProtocol: spec.protocol,
      checks: [],
      status: "failed",
      errorMessage: message(error),
    };
  }
  const gradingCases: BenchmarkGradingCaseResult[] = spec.cases.map((c) => {
    try {
      const circuit = expandParameterizedProgram(program, c);
      let check: BenchmarkCheckResult;
      if (spec.mode === "unitary")
        check = {
          type: "unitary",
          ...compareReferenceCircuit(
            circuit,
            c.reference!,
            spec.tolerance,
            spec.upToGlobalPhase
          ),
        };
      else {
        const actual = new Simulator(circuit).exportPayload().amplitudes;
        const expected = c.expected!;
        let phase = { real: 1, imaginary: 0 };
        if (spec.upToGlobalPhase) {
          let pivot = 0;
          for (let i = 1; i < expected.length; i++)
            if (
              Math.hypot(expected[i].real, expected[i].imaginary) >
              Math.hypot(expected[pivot].real, expected[pivot].imaginary)
            )
              pivot = i;
          const a = actual[pivot],
            e = expected[pivot],
            norm = Math.hypot(a.real, a.imag) * Math.hypot(e.real, e.imaginary);
          if (norm > 0)
            phase = {
              real: (a.real * e.real + a.imag * e.imaginary) / norm,
              imaginary: (a.imag * e.real - a.real * e.imaginary) / norm,
            };
        }
        const displayed = [];
        let count = 0;
        for (let i = 0; i < expected.length; i++) {
          const e = expected[i],
            a = actual[i],
            target = {
              real: e.real * phase.real - e.imaginary * phase.imaginary,
              imaginary: e.real * phase.imaginary + e.imaginary * phase.real,
            };
          if (
            Number.isFinite(a.real) &&
            Number.isFinite(a.imag) &&
            Math.abs(a.real - target.real) <= spec.tolerance &&
            Math.abs(a.imag - target.imaginary) <= spec.tolerance
          )
            continue;
          count++;
          if (displayed.length < 16)
            displayed.push({
              basis: `|${i.toString(2).padStart(c.qubits, "0")}>`,
              expected: target,
              actual: { real: a.real, imaginary: a.imag },
            });
        }
        check = {
          type: "run",
          status: count === 0 ? "passed" : "failed",
          mismatches: { displayed, omittedCount: count - displayed.length },
        };
      }
      if (c.hidden)
        check = { ...check, mismatches: { displayed: [], omittedCount: 0 } };
      return { caseId: c.id, checks: [check], status: check.status };
    } catch (error) {
      return {
        caseId: c.id,
        checks: [],
        status: "failed",
        errorMessage: message(error),
      };
    }
  });
  return {
    submissionProtocol: spec.protocol,
    checks: gradingCases.flatMap((c) => c.checks),
    gradingCases,
    status: gradingCases.every((c) => c.status === "passed")
      ? "passed"
      : "failed",
  };
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
