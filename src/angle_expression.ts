export class AngleExpressionError extends Error {}

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/u;
const NUMERIC_PATTERN = /^[+-]?\d+(?:\.\d+)?$/u;
const MULTIPLIED_PATTERN = /^(?<coefficient>[+-]?\d+(?:\.\d+)?)\*(?<term>.+)$/u;
const PI_PATTERN =
  /^(?<sign>[+-]?)(?:(?<coefficient>\d+(?:\.\d+)?)(?:\*)?)?(?:π|pi)(?:(?:\/|_)(?<denominator>\d+(?:\.\d+)?))?$/u;
const SIGNED_IDENTIFIER_PATTERN =
  /^(?<sign>[+-])(?<identifier>[a-zA-Z_][a-zA-Z0-9_]*)$/u;
const MAX_LENGTH = 4096;
const MAX_NODES = 256;
const MAX_DEPTH = 64;

type AngleFunction = "sqrt" | "asin" | "acos" | "atan";
type Operator = "+" | "-" | "*" | "/";
type NodeShape =
  | { readonly kind: "number"; readonly value: number; readonly text: string }
  | { readonly kind: "pi"; readonly denominator: number; readonly text: string }
  | { readonly kind: "variable"; readonly name: string }
  | {
      readonly kind: "unary";
      readonly operator: "+" | "-";
      readonly operand: Node;
    }
  | {
      readonly kind: "binary";
      readonly operator: Operator;
      readonly left: Node;
      readonly right: Node;
    }
  | {
      readonly kind: "call";
      readonly name: AngleFunction;
      readonly argument: Node;
    };
type Node = NodeShape & {
  readonly depth: number;
  readonly constant?: number;
  readonly angular: boolean;
};
type Token =
  | { readonly kind: "number" | "identifier" | "pi"; readonly text: string }
  | { readonly kind: "symbol"; readonly text: Operator | "(" | ")" }
  | { readonly kind: "end"; readonly text: "" };

interface AngleTerm {
  readonly concrete: boolean;
  readonly radians: (variables: Readonly<Record<string, string>>) => number;
  readonly text: string;
  readonly usesPiOrInverseTrig: boolean;
}

export function validAngleIdentifier(value: string): boolean {
  // Keep existing variable names, including function names when used without ().
  return IDENTIFIER_PATTERN.test(value) && !PI_PATTERN.test(value);
}

export class AngleExpression {
  constructor(private readonly rawValue: unknown) {}

  concrete(): boolean {
    return this.parse().concrete;
  }
  radians(variables: Readonly<Record<string, string>> = {}): number {
    return this.parse().radians(variables);
  }
  toString(): string {
    return this.parse().text;
  }

  parse(): AngleTerm {
    const source = String(this.rawValue);
    if (source.length > MAX_LENGTH)
      throw new AngleExpressionError(
        `angle expression exceeds ${MAX_LENGTH} characters`
      );
    const value = source
      .replaceAll(" ", "")
      .replaceAll("θ", "theta")
      .replace(/(?<=\d)theta/gu, "*theta");
    if (!value) throw new AngleExpressionError("angle is required");
    if (value.length > MAX_LENGTH)
      throw new AngleExpressionError(
        `angle expression exceeds ${MAX_LENGTH} characters`
      );
    const node = new AngleParser(value).parse();
    return {
      concrete: node.constant !== undefined,
      radians: (variables) => evaluate(node, variables),
      text: legacyText(value) ?? format(node),
      usesPiOrInverseTrig: node.angular,
    };
  }
}

class AngleParser {
  private position = 0;
  private nodes = 0;
  private token: Token;

  constructor(private readonly source: string) {
    this.token = this.nextToken();
  }

  parse(): Node {
    const node = this.sum(0);
    if (this.token.kind !== "end") this.invalid();
    return node;
  }

  private sum(depth: number): Node {
    let left = this.product(depth);
    while (this.is("+") || this.is("-")) {
      const operator = this.token.text === "+" ? "+" : "-";
      this.advance();
      left = this.node({
        kind: "binary",
        operator,
        left,
        right: this.product(depth),
      });
    }
    return left;
  }

  private product(depth: number): Node {
    let left = this.unary(depth);
    while (
      this.is("*") ||
      this.is("/") ||
      (signedNumber(left) && this.token.kind === "pi")
    ) {
      const implicit = this.token.kind === "pi";
      const operator = this.token.text === "/" ? "/" : "*";
      if (!implicit) this.advance();
      left = this.node({
        kind: "binary",
        operator,
        left,
        right: this.unary(depth),
      });
    }
    return left;
  }

  private unary(depth: number): Node {
    this.checkDepth(depth);
    if (this.is("+") || this.is("-")) {
      const operator = this.token.text === "+" ? "+" : "-";
      this.advance();
      return this.node({
        kind: "unary",
        operator,
        operand: this.unary(depth + 1),
      });
    }
    return this.primary(depth);
  }

  private primary(depth: number): Node {
    const token = this.token;
    if (token.kind === "number") {
      this.advance();
      return this.node({
        kind: "number",
        value: finite(Number(token.text)),
        text: token.text,
      });
    }
    if (token.kind === "pi") {
      this.advance();
      const denominator = token.text.split("_")[1] ?? "1";
      return this.node({
        kind: "pi",
        denominator: finite(Number(denominator)),
        text: denominator === "1" ? "π" : `π/${denominator}`,
      });
    }
    if (token.kind === "identifier") {
      this.advance();
      if (!this.is("("))
        return this.node({ kind: "variable", name: token.text });
      const name = token.text;
      if (
        name !== "sqrt" &&
        name !== "asin" &&
        name !== "acos" &&
        name !== "atan"
      )
        throw new AngleExpressionError(`unknown angle function: ${name}`);
      this.advance();
      this.checkDepth(depth + 1);
      const argument = this.sum(depth + 1);
      this.close();
      return this.node({ kind: "call", name, argument });
    }
    if (this.is("(")) {
      this.advance();
      this.checkDepth(depth + 1);
      const node = this.sum(depth + 1);
      this.close();
      return node;
    }
    return this.invalid();
  }

  private node(shape: NodeShape): Node {
    if (++this.nodes > MAX_NODES)
      throw new AngleExpressionError(
        `angle expression exceeds ${MAX_NODES} nodes`
      );
    const children =
      shape.kind === "binary"
        ? [shape.left, shape.right]
        : shape.kind === "unary"
          ? [shape.operand]
          : shape.kind === "call"
            ? [shape.argument]
            : [];
    const depth = 1 + Math.max(0, ...children.map((n) => n.depth));
    this.checkDepth(depth);
    const node: Node = {
      ...shape,
      depth,
      angular:
        shape.kind === "pi" ||
        (shape.kind === "call" && shape.name !== "sqrt") ||
        children.some((n) => n.angular),
    };
    if (
      shape.kind !== "variable" &&
      children.every((n) => n.constant !== undefined)
    )
      return { ...node, constant: evaluate(node, {}) };
    return node;
  }

  private checkDepth(depth: number): void {
    if (depth > MAX_DEPTH)
      throw new AngleExpressionError(
        `angle expression exceeds depth ${MAX_DEPTH}`
      );
  }
  private is(text: string): boolean {
    return this.token.text === text;
  }
  private advance(): void {
    this.token = this.nextToken();
  }
  private close(): void {
    if (!this.is(")")) this.invalid();
    this.advance();
  }
  private invalid(): never {
    throw new AngleExpressionError(`invalid angle: ${this.source}`);
  }

  private nextToken(): Token {
    const rest = this.source.slice(this.position);
    if (!rest) return { kind: "end", text: "" };
    const pi = /^(?:π|pi)(?:_\d+(?:\.\d+)?)?/u.exec(rest)?.[0];
    if (pi && !/[A-Za-z0-9_]/u.test(rest[pi.length] ?? "")) {
      this.position += pi.length;
      return { kind: "pi", text: pi };
    }
    const number = /^\d+(?:\.\d+)?/u.exec(rest)?.[0];
    if (number) {
      this.position += number.length;
      return { kind: "number", text: number };
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(rest)?.[0];
    if (identifier) {
      this.position += identifier.length;
      return { kind: "identifier", text: identifier };
    }
    const symbol = rest[0];
    switch (symbol) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "(":
      case ")":
        this.position++;
        return { kind: "symbol", text: symbol };
      default:
        return this.invalid();
    }
  }
}

function finite(value: number): number {
  if (!Number.isFinite(value))
    throw new AngleExpressionError("angle must be finite");
  return value;
}

function evaluate(
  node: Node,
  variables: Readonly<Record<string, string>>
): number {
  if (node.constant !== undefined) return node.constant;
  switch (node.kind) {
    case "number":
      return finite(node.value);
    case "pi":
      if (node.denominator === 0)
        throw new AngleExpressionError(
          "angle must be finite: division by zero"
        );
      return finite(Math.PI / node.denominator);
    case "variable": {
      if (!Object.hasOwn(variables, node.name))
        throw new AngleExpressionError(
          `unresolved angle variable: ${node.name}`
        );
      const expression = new AngleExpression(variables[node.name]).parse();
      if (!expression.concrete)
        throw new AngleExpressionError(
          `variable value must be concrete: ${node.name}`
        );
      return finite(expression.radians({}));
    }
    case "unary":
      return finite(
        (node.operator === "-" ? -1 : 1) * evaluate(node.operand, variables)
      );
    case "binary": {
      const left = evaluate(node.left, variables),
        right = evaluate(node.right, variables);
      switch (node.operator) {
        case "+":
          return finite(left + right);
        case "-":
          return finite(left - right);
        case "*":
          return finite(left * right);
        case "/":
          if (right === 0)
            throw new AngleExpressionError(
              "angle must be finite: division by zero"
            );
          return finite(left / right);
      }
    }
    case "call": {
      const value = evaluate(node.argument, variables);
      switch (node.name) {
        case "sqrt":
          if (value < 0)
            throw new AngleExpressionError(
              "sqrt domain error: argument must be non-negative"
            );
          return finite(Math.sqrt(value));
        case "asin":
        case "acos":
          if (value < -1 || value > 1)
            throw new AngleExpressionError(
              `${node.name} domain error: argument must be in [-1,1]`
            );
          return finite(
            node.name === "asin" ? Math.asin(value) : Math.acos(value)
          );
        case "atan":
          return finite(Math.atan(value));
      }
    }
  }
}

function signedNumber(node: Node): boolean {
  return (
    node.kind === "number" ||
    (node.kind === "unary" && signedNumber(node.operand))
  );
}

function precedence(node: Node): number {
  if (node.kind === "binary")
    return node.operator === "+" || node.operator === "-" ? 10 : 20;
  if (node.kind === "unary") return 30;
  // A pi_N alias is one value; parentheses preserve it in 1/pi_N.
  if (node.kind === "pi" && node.text !== "π") return 20;
  return 100;
}

function format(node: Node, parentPrecedence = 0): string {
  let text: string;
  switch (node.kind) {
    case "number":
    case "pi":
      text = node.text;
      break;
    case "variable":
      text = node.name;
      break;
    case "call":
      text = `${node.name}(${format(node.argument)})`;
      break;
    case "unary":
      text = `${node.operator === "+" ? "" : "-"}${format(node.operand, 31)}`;
      break;
    case "binary":
      text = `${format(node.left, precedence(node))}${node.operator}${format(node.right, precedence(node) + 1)}`;
      break;
  }
  return precedence(node) < parentPrecedence ? `(${text})` : text;
}

// Display compatibility only. All syntax and evaluation above use the bounded AST.
function legacyText(value: string): string | undefined {
  if (
    NUMERIC_PATTERN.test(value) ||
    (IDENTIFIER_PATTERN.test(value) && !PI_PATTERN.test(value))
  )
    return value;
  const pi = PI_PATTERN.exec(value)?.groups;
  if (pi) {
    const coefficient = pi.coefficient ?? "1",
      denominator = pi.denominator ?? "1";
    return `${pi.sign === "-" ? "-" : ""}${coefficient === "1" ? "" : coefficient}π${denominator === "1" ? "" : `/${denominator}`}`;
  }
  const signed = SIGNED_IDENTIFIER_PATTERN.exec(value)?.groups;
  if (signed) return `${signed.sign === "-" ? "-" : ""}${signed.identifier}`;
  const product = MULTIPLIED_PATTERN.exec(value)?.groups;
  if (product) {
    const inner = legacyText(product.term);
    if (inner !== undefined) return `${product.coefficient}*${inner}`;
  }
  return undefined;
}
