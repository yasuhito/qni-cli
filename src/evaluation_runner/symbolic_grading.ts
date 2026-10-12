import { spawnSync } from "node:child_process";
import { openSync, closeSync, fstatSync, readSync, constants } from "node:fs";
import path = require("node:path");
import type { CommandHandlerContext } from "../dispatcher";

export const SYMBOLIC_PROTOCOL = "neutral-symbolic-circuit-json-v1";
export interface SymbolicSpecification {
  readonly protocol: typeof SYMBOLIC_PROTOCOL;
  readonly qubits: number;
  readonly mode: "unitary" | "state";
  readonly parameters: readonly {
    readonly name: string;
    readonly real: true;
    readonly domain: "real";
  }[];
  readonly reference: Readonly<Record<string, unknown>>;
  readonly up_to_global_phase: boolean;
}
export interface SymbolicProof {
  readonly verdict: "proved" | "unproven";
  readonly reason: string;
}
export interface SymbolicCheckResult {
  readonly type: "symbolic";
  readonly status: "passed" | "failed";
  readonly proof: SymbolicProof;
}

export function parseSymbolicSpecification(
  value: unknown
): SymbolicSpecification {
  if (
    !record(value) ||
    Object.keys(value).sort().join(",") !==
      "mode,parameters,protocol,qubits,reference,up_to_global_phase" ||
    value.protocol !== SYMBOLIC_PROTOCOL ||
    !Number.isInteger(value.qubits) ||
    typeof value.qubits !== "number" ||
    value.qubits < 1 ||
    value.qubits > 4 ||
    !["unitary", "state"].includes(String(value.mode)) ||
    typeof value.up_to_global_phase !== "boolean" ||
    !record(value.reference) ||
    !Array.isArray(value.reference.operations) ||
    !Array.isArray(value.parameters) ||
    value.parameters.length < 1 ||
    value.parameters.length > 8
  ) {
    throw new Error("invalid symbolic specification");
  }
  const names = new Set<string>();
  for (const parameter of value.parameters) {
    if (
      !record(parameter) ||
      Object.keys(parameter).sort().join(",") !== "domain,name,real" ||
      typeof parameter.name !== "string" ||
      !/^[a-z][a-z0-9_]{0,31}$/u.test(parameter.name) ||
      names.has(parameter.name) ||
      parameter.real !== true ||
      parameter.domain !== "real"
    ) {
      throw new Error("invalid symbolic real parameter declaration");
    }
    names.add(parameter.name);
  }
  return value as unknown as SymbolicSpecification;
}

/** The submitted JSON is data only. The bounded helper owns exact matrix proof. */
export function proveSymbolicSubmission(options: {
  readonly specification: SymbolicSpecification;
  readonly submissionPath: string;
  readonly availableGates: readonly string[];
  readonly context: CommandHandlerContext;
}): SymbolicCheckResult {
  const unproven = (reason: string): SymbolicCheckResult => ({
    type: "symbolic",
    status: "failed",
    proof: { verdict: "unproven", reason },
  });
  let submission: unknown;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      options.submissionPath,
      constants.O_RDONLY | constants.O_NONBLOCK
    );
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) return unproven("submission must be a regular file");
    if (stats.size > 64 * 1024) return unproven("submission exceeds 64 KiB");
    const buffer = Buffer.alloc(64 * 1024 + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(
        descriptor,
        buffer,
        length,
        buffer.length - length,
        null
      );
      if (count === 0) break;
      length += count;
    }
    if (length > 64 * 1024) return unproven("submission exceeds 64 KiB");
    submission = JSON.parse(
      buffer.subarray(0, length).toString("utf8")
    ) as unknown;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw new Error("submission file does not exist");
    return unproven("submission must be restricted neutral JSON");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  const output = spawnSync(
    path.join(options.context.projectRoot, ".python-symbolic", "bin", "python"),
    [
      "-I",
      "-B",
      path.join(
        options.context.projectRoot,
        "libexec",
        "qni_symbolic_grade.py"
      ),
    ],
    {
      input: JSON.stringify({
        specification: options.specification,
        submission,
        allowedGates: options.availableGates.map((gate) => gate.split("(")[0]),
      }),
      encoding: "utf8",
      timeout: 15_000,
      killSignal: "SIGKILL",
      maxBuffer: 64 * 1024,
      cwd: options.context.projectRoot,
      env: { PATH: "/usr/bin:/bin" },
    }
  );
  if (output.error) {
    const code = "code" in output.error ? output.error.code : undefined;
    if (code === "ENOENT")
      throw new Error(
        "symbolic grading requires scripts/setup_symbolic_python.sh"
      );
    if (code === "ETIMEDOUT" || code === "ENOBUFS")
      return unproven("proof timeout or resource limit");
    throw new Error(`symbolic proof runtime failed: ${String(code)}`);
  }
  if (output.signal === "SIGKILL" || output.signal === "SIGXCPU")
    return unproven("proof timeout or resource limit");
  if (output.signal)
    throw new Error(`symbolic proof runtime failed: ${output.signal}`);
  if (output.status !== 0)
    throw new Error(
      output.stderr.includes("InvalidTaskReference")
        ? "invalid symbolic task reference"
        : "symbolic proof runtime failed"
    );
  const proof: unknown = JSON.parse(output.stdout);
  if (
    !record(proof) ||
    !["proved", "unproven"].includes(String(proof.verdict)) ||
    typeof proof.reason !== "string"
  )
    throw new Error("invalid symbolic proof response");
  return {
    type: "symbolic",
    status: proof.verdict === "proved" ? "passed" : "failed",
    proof: {
      verdict: proof.verdict as SymbolicProof["verdict"],
      reason: proof.reason,
    },
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
