import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import type { CircuitData } from "../circuit_file";
import { validateReferenceCircuit } from "./reference_circuit";

export const PARAMETERIZED_PROTOCOL = "neutral-parameterized-circuit-json-v1";
type RecordValue = Record<string, unknown>;
export type InputValue = number | boolean | InputValue[];
export interface InputDeclaration {
  name: string;
  type: "int" | "real" | "bool" | "bits";
  min?: number;
  max?: number;
}
export interface ParameterizedCase {
  id: string;
  inputs: Record<string, InputValue>;
  qubits: number;
  hidden: boolean;
  reference?: CircuitData;
  expected?: { real: number; imaginary: number }[];
}
export interface ParameterizedSpecification {
  protocol: typeof PARAMETERIZED_PROTOCOL;
  inputs: InputDeclaration[];
  cases: ParameterizedCase[];
  mode: "state" | "unitary";
  tolerance: number;
  upToGlobalPhase: boolean;
}
const NAME = /^[a-z][a-z0-9_]{0,31}$/u;
const MAX_STEPS = 100000;
const MAX_OPERATIONS = 1024;
const MAX_NUMBER = 1000000;
const BINARY = new Set([
  "add",
  "sub",
  "mul",
  "div",
  "mod",
  "pow",
  "eq",
  "ne",
  "lt",
  "le",
  "and",
  "or",
  "at",
]);
const UNARY = new Set([
  "len",
  "neg",
  "not",
  "sqrt",
  "sin",
  "cos",
  "asin",
  "acos",
  "floor",
]);
const GATES: Record<
  string,
  {
    symbol: string;
    controls: number | "many";
    targets: number;
    angle?: boolean;
  }
> = {
  X: { symbol: "X", controls: 0, targets: 1 },
  Y: { symbol: "Y", controls: 0, targets: 1 },
  Z: { symbol: "Z", controls: 0, targets: 1 },
  H: { symbol: "H", controls: 0, targets: 1 },
  Ry: { symbol: "Ry", controls: 0, targets: 1, angle: true },
  Rx: { symbol: "Rx", controls: 0, targets: 1, angle: true },
  Rz: { symbol: "Rz", controls: 0, targets: 1, angle: true },
  Phase: { symbol: "P", controls: 0, targets: 1, angle: true },
  GlobalPhase: { symbol: "GlobalPhase", controls: 0, targets: 1, angle: true },
  CNOT: { symbol: "X", controls: 1, targets: 1 },
  MCX: { symbol: "X", controls: "many", targets: 1 },
  CZ: { symbol: "Z", controls: 1, targets: 1 },
  CRy: { symbol: "Ry", controls: 1, targets: 1, angle: true },
  CRx: { symbol: "Rx", controls: 1, targets: 1, angle: true },
  SWAP: { symbol: "Swap", controls: 0, targets: 2 },
};
/** Expand a shortest round-trip exponent without rounding; the simulator accepts decimal text. */
function decimalRadians(value: number): string {
  const text = String(value);
  if (!text.includes("e")) return text;
  const [mantissa, exponent] = text.split("e");
  const sign = mantissa.startsWith("-") ? "-" : "";
  const unsigned = sign ? mantissa.slice(1) : mantissa;
  const point =
    (unsigned.includes(".") ? unsigned.indexOf(".") : unsigned.length) +
    Number(exponent);
  const digits = unsigned.replace(".", "");
  return (
    sign +
    (point <= 0
      ? `0.${"0".repeat(-point)}${digits}`
      : point >= digits.length
        ? digits + "0".repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`)
  );
}
function fail(message: string): never {
  throw new Error(`parameterized: ${message}`);
}
function record(value: unknown): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail("expected object");
  return value as RecordValue;
}
function keys(
  value: RecordValue,
  required: string[],
  optional: string[] = []
): void {
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(
      (key) => !required.includes(key) && !optional.includes(key)
    )
  )
    fail("invalid object keys");
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 256)
    fail("expected array of at most 256 entries");
  return value;
}
function number(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_NUMBER
  )
    fail("expected bounded finite number");
  return value;
}
function integer(value: unknown): number {
  const n = number(value);
  if (!Number.isSafeInteger(n)) fail("expected integer");
  return n;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") fail("expected boolean");
  return value;
}
function name(value: unknown): string {
  if (typeof value !== "string" || !NAME.test(value))
    fail("invalid identifier");
  return value;
}
export function parseInputDeclarations(value: unknown): InputDeclaration[] {
  const seen = new Set<string>();
  return list(value).map((item) => {
    const d = record(item);
    keys(d, ["name", "type"], ["min", "max"]);
    const id = name(d.name);
    if (seen.has(id)) fail("duplicate input");
    seen.add(id);
    if (!["int", "real", "bool", "bits"].includes(String(d.type)))
      fail("invalid input type");
    if (d.type === "bool") {
      keys(d, ["name", "type"]);
      return { name: id, type: "bool" };
    }
    keys(d, ["name", "type", "min", "max"]);
    const min = number(d.min),
      max = number(d.max);
    if (
      min > max ||
      (d.type !== "real" &&
        (!Number.isInteger(min) || !Number.isInteger(max))) ||
      (d.type === "bits" && (min < 0 || max > 256))
    )
      fail("invalid input domain");
    return { name: id, type: d.type as InputDeclaration["type"], min, max };
  });
}
function validateInputs(
  value: unknown,
  declarations: InputDeclaration[]
): Record<string, InputValue> {
  const inputs = record(value);
  keys(
    inputs,
    declarations.map((d) => d.name)
  );
  for (const d of declarations) {
    const v = inputs[d.name];
    if (d.type === "bool") boolean(v);
    else {
      const n =
        d.type === "bits"
          ? list(v).length
          : d.type === "int"
            ? integer(v)
            : number(v);
      if (n < d.min! || n > d.max!) fail("input outside declared domain");
      if (d.type === "bits") list(v).forEach(boolean);
    }
  }
  return inputs as Record<string, InputValue>;
}
export function parseParameterizedSpecification(
  value: unknown
): ParameterizedSpecification {
  const s = record(value);
  keys(s, [
    "protocol",
    "inputs",
    "cases",
    "mode",
    "tolerance",
    "up_to_global_phase",
  ]);
  if (
    s.protocol !== PARAMETERIZED_PROTOCOL ||
    (s.mode !== "state" && s.mode !== "unitary")
  )
    fail("invalid specification");
  const inputs = parseInputDeclarations(s.inputs),
    tolerance = number(s.tolerance),
    upToGlobalPhase = boolean(s.up_to_global_phase);
  if (tolerance < 0 || tolerance > 1e-6) fail("tolerance must be 0..1e-6");
  const rawCases = list(s.cases);
  if (rawCases.length < 2 || rawCases.length > 32)
    fail("expected 2..32 grading cases");
  const seen = new Set<string>();
  const cases = rawCases.map((item) => {
    const c = record(item);
    keys(
      c,
      [
        "id",
        "inputs",
        "qubits",
        s.mode === "state" ? "expected" : "reference_circuit",
      ],
      ["hidden"]
    );
    const id = name(c.id);
    if (seen.has(id)) fail("duplicate case");
    seen.add(id);
    const qubits = integer(c.qubits);
    if (qubits < 1 || qubits > 8) fail("width must be 1..8");
    const base = {
      id,
      inputs: validateInputs(c.inputs, inputs),
      qubits,
      hidden: c.hidden === undefined ? false : boolean(c.hidden),
    };
    if (s.mode === "unitary") {
      const r = record(c.reference_circuit);
      keys(r, ["qubits", "cols"]);
      const reference = r as unknown as CircuitData;
      if (
        reference.qubits !== qubits ||
        !Array.isArray(reference.cols) ||
        reference.cols.length > MAX_OPERATIONS
      )
        fail("invalid reference width or length");
      validateReferenceCircuit(reference);
      return { ...base, reference };
    }
    const expected = list(c.expected).map((item) => {
      const a = record(item);
      keys(a, ["real", "imaginary"]);
      return { real: number(a.real), imaginary: number(a.imaginary) };
    });
    if (
      expected.length !== 2 ** qubits ||
      Math.abs(
        expected.reduce((sum, a) => sum + a.real ** 2 + a.imaginary ** 2, 0) - 1
      ) > 1e-9
    )
      fail("expected state must be normalized and full width");
    return { ...base, expected };
  });
  return {
    protocol: PARAMETERIZED_PROTOCOL,
    inputs,
    cases,
    mode: s.mode,
    tolerance,
    upToGlobalPhase,
  };
}
/** Open once, reject non-regular files before reading, and cap actual bytes too. */
export function readParameterizedSubmission(file: string): unknown {
  const fd = openSync(file, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 65536)
      fail("submission must be a regular file of at most 64 KiB");
    const buffer = Buffer.alloc(65537);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > 65536) fail("submission exceeds 64 KiB");
    return JSON.parse(buffer.subarray(0, length).toString("utf8")) as unknown;
  } finally {
    closeSync(fd);
  }
}
/** Validate even unreachable branches. No source strings, eval, recursion, or host APIs. */
export function parseParameterizedProgram(
  value: unknown,
  specification: ParameterizedSpecification,
  availableGates: readonly string[]
): RecordValue {
  const program = record(value);
  keys(program, ["protocol", "inputs", "qubits", "body"]);
  if (
    program.protocol !== PARAMETERIZED_PROTOCOL ||
    JSON.stringify(parseInputDeclarations(program.inputs)) !==
      JSON.stringify(specification.inputs)
  )
    fail("input declarations must match task");
  let nodes = 0;
  const budget = (depth: number) => {
    if (depth > 16 || ++nodes > 2048) fail("syntax limit exceeded");
  };
  const expression = (v: unknown, depth: number, scope: Set<string>): void => {
    budget(depth);
    if (typeof v === "boolean") return;
    if (typeof v === "number") {
      number(v);
      return;
    }
    const e = record(v);
    if (Object.keys(e).length !== 1) fail("expression must have one operator");
    const [op] = Object.keys(e),
      arg = e[op];
    if (op === "pi") {
      if (arg !== true) fail("pi must be true");
      return;
    }
    if (op === "input" || op === "var") {
      const id = name(arg);
      if (
        !(op === "input"
          ? specification.inputs.some((d) => d.name === id)
          : scope.has(id))
      )
        fail("undeclared name");
      return;
    }
    if (UNARY.has(op)) {
      expression(arg, depth + 1, scope);
      return;
    }
    if (BINARY.has(op) || op === "range" || op === "array" || op === "select") {
      const args = list(arg);
      if (op !== "array" && args.length !== (op === "select" ? 3 : 2))
        fail("operator arity");
      args.forEach((a) => expression(a, depth + 1, scope));
      return;
    }
    fail("unknown expression operator");
  };
  const allowed = new Set(availableGates.map((g) => g.split("(")[0].trim()));
  const body = (v: unknown, depth: number, scope: Set<string>): void => {
    budget(depth);
    for (const item of list(v)) {
      budget(depth);
      const s = record(item);
      if (Object.hasOwn(s, "gate")) {
        keys(s, ["gate", "targets"], ["controls", "angle"]);
        if (
          typeof s.gate !== "string" ||
          !Object.hasOwn(GATES, s.gate) ||
          !allowed.has(s.gate)
        )
          fail("gate not available");
        expression(s.targets, depth + 1, scope);
        if (s.controls !== undefined) expression(s.controls, depth + 1, scope);
        if (Boolean(GATES[s.gate].angle) !== Object.hasOwn(s, "angle"))
          fail("invalid angle presence");
        if (s.angle !== undefined) expression(s.angle, depth + 1, scope);
      } else if (Object.hasOwn(s, "for")) {
        keys(s, ["for", "from", "to", "body"]);
        const id = name(s.for);
        if (scope.has(id) || specification.inputs.some((d) => d.name === id))
          fail("variable shadowing");
        expression(s.from, depth + 1, scope);
        expression(s.to, depth + 1, scope);
        body(s.body, depth + 1, new Set([...scope, id]));
      } else if (Object.hasOwn(s, "if")) {
        keys(s, ["if", "then"], ["else"]);
        expression(s.if, depth + 1, scope);
        body(s.then, depth + 1, new Set(scope));
        if (s.else !== undefined) body(s.else, depth + 1, new Set(scope));
      } else if (Object.hasOwn(s, "let") || Object.hasOwn(s, "set")) {
        const op = Object.hasOwn(s, "let") ? "let" : "set";
        keys(s, [op, "value"]);
        const id = name(s[op]);
        if (
          op === "let"
            ? scope.has(id) || specification.inputs.some((d) => d.name === id)
            : !scope.has(id)
        )
          fail("invalid variable binding");
        expression(s.value, depth + 1, scope);
        if (op === "let") scope.add(id);
      } else fail("unknown statement");
    }
  };
  expression(program.qubits, 0, new Set());
  body(program.body, 0, new Set());
  return program;
}
export function expandParameterizedProgram(
  program: RecordValue,
  gradingCase: ParameterizedCase
): CircuitData {
  let steps = 0;
  const tick = () => {
    if (++steps > MAX_STEPS) fail("evaluation budget exceeded");
  };
  const env = new Map<string, InputValue>();
  const expr = (v: unknown): InputValue => {
    tick();
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return number(v);
    const e = record(v),
      [op] = Object.keys(e),
      arg = e[op];
    if (op === "pi") return Math.PI;
    if (op === "input" || op === "var") {
      const id = name(arg);
      const result = op === "input" ? gradingCase.inputs[id] : env.get(id);
      if (result === undefined) fail("unbound variable");
      return result;
    }
    if (op === "select") {
      const a = list(arg);
      return expr(boolean(expr(a[0])) ? a[1] : a[2]);
    }
    if (op === "array") return list(arg).map(expr);
    if (UNARY.has(op)) {
      const a = expr(arg);
      if (op === "len") return list(a).length;
      if (op === "not") return !boolean(a);
      const n = number(a);
      const result =
        op === "neg"
          ? -n
          : op === "sqrt"
            ? Math.sqrt(n)
            : op === "sin"
              ? Math.sin(n)
              : op === "cos"
                ? Math.cos(n)
                : op === "asin"
                  ? Math.asin(n)
                  : op === "acos"
                    ? Math.acos(n)
                    : Math.floor(n);
      return number(result);
    }
    const args = list(arg),
      a = expr(args[0]),
      b = expr(args[1]);
    if (op === "and" || op === "or") {
      const x = boolean(a),
        y = boolean(b);
      return op === "and" ? x && y : x || y;
    }
    if (op === "at") {
      const array = list(a),
        index = integer(b);
      if (index < 0 || index >= array.length)
        fail("array index outside bounds");
      return array[index] as InputValue;
    }
    if (op === "eq" || op === "ne") {
      if (typeof a !== typeof b || Array.isArray(a) || Array.isArray(b))
        fail("scalar equality only");
      return op === "eq" ? a === b : a !== b;
    }
    const x = number(a),
      y = number(b);
    if (op === "lt") return x < y;
    if (op === "le") return x <= y;
    if (op === "range") {
      const start = integer(x),
        end = integer(y);
      if (end < start || end - start > 256) fail("invalid range");
      return Array.from({ length: end - start }, (_, i) => start + i);
    }
    return number(
      op === "add"
        ? x + y
        : op === "sub"
          ? x - y
          : op === "mul"
            ? x * y
            : op === "div"
              ? x / y
              : op === "mod"
                ? x % y
                : Math.pow(x, y)
    );
  };
  const qubits = integer(expr(program.qubits));
  if (qubits !== gradingCase.qubits) fail("qubit count mismatch");
  const cols: unknown[][] = [];
  const body = (value: unknown): void => {
    const existing = new Set(env.keys());
    for (const item of list(value)) {
      tick();
      const s = record(item);
      if (Object.hasOwn(s, "for")) {
        const start = integer(expr(s.from)),
          end = integer(expr(s.to));
        if (end < start || end - start > MAX_STEPS)
          fail("loop range limit exceeded");
        for (let i = start; i < end; i++) {
          tick();
          env.set(String(s.for), i);
          body(s.body);
        }
        env.delete(String(s.for));
      } else if (Object.hasOwn(s, "if")) {
        const yes = boolean(expr(s.if));
        body(yes ? s.then : (s.else ?? []));
      } else if (Object.hasOwn(s, "let") || Object.hasOwn(s, "set")) {
        const id = String(s.let ?? s.set),
          v = expr(s.value);
        if (s.set !== undefined && typeof env.get(id) !== typeof v)
          fail("variable type changed");
        env.set(id, v);
      } else {
        if (cols.length >= MAX_OPERATIONS) fail("operation limit exceeded");
        const gate = GATES[String(s.gate)];
        const targets = list(expr(s.targets)).map(integer),
          controls =
            s.controls === undefined ? [] : list(expr(s.controls)).map(integer);
        const all = [...targets, ...controls];
        if (
          targets.length !== gate.targets ||
          (gate.controls === "many"
            ? controls.length < 1
            : controls.length !== gate.controls) ||
          new Set(all).size !== all.length ||
          all.some((i) => i < 0 || i >= qubits)
        )
          fail("invalid gate indices or arity");
        const col: unknown[] = Array.from({ length: qubits }, () => 1);
        const symbol = gate.angle
          ? `${gate.symbol}(${decimalRadians(number(expr(s.angle)))})`
          : gate.symbol;
        for (const t of targets) col[t] = symbol;
        for (const c of controls) col[c] = "•";
        cols.push(col);
      }
    }
    for (const id of env.keys()) if (!existing.has(id)) env.delete(id);
  };
  body(program.body);
  return { qubits, cols };
}
