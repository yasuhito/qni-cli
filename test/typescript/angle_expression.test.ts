import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AngleExpression,
  AngleExpressionError,
  validAngleIdentifier,
} from "../../src/angle_expression";

function parsed(value: string, variables: Record<string, string> = {}) {
  const expression = new AngleExpression(value);
  return {
    concrete: expression.concrete(),
    radians: expression.radians(variables),
    text: expression.toString(),
  };
}

describe("AngleExpression", () => {
  for (const [value, radians, text] of [
    ["pi", Math.PI, "π"],
    ["-pi", -Math.PI, "-π"],
    ["+pi", Math.PI, "π"],
    ["pi_2", Math.PI / 2, "π/2"],
    ["-pi_4", -Math.PI / 4, "-π/4"],
    ["π", Math.PI, "π"],
    ["-π", -Math.PI, "-π"],
    ["1*pi", Math.PI, "π"],
    ["pi/1", Math.PI, "π"],
    ["2*pi", 2 * Math.PI, "2π"],
    ["5*pi/3", (5 * Math.PI) / 3, "5π/3"],
    ["-pi/2", -Math.PI / 2, "-π/2"],
    ["π_2", Math.PI / 2, "π/2"],
    ["1.5", 1.5, "1.5"],
  ] as const) {
    it(`parses ${value} as a concrete angle`, () => {
      assert.deepEqual(parsed(value), { concrete: true, radians, text });
    });
  }

  for (const [value, radians, text] of [
    ["theta", Math.PI / 4, "theta"],
    ["-theta", -Math.PI / 4, "-theta"],
    ["2*theta", Math.PI / 2, "2*theta"],
    ["pix", Math.PI / 4, "pix"],
    ["pi2", Math.PI / 4, "pi2"],
  ] as const) {
    it(`keeps ${value} as a symbolic variable`, () => {
      const variable = value.replace(/^-|^2\*/u, "");
      assert.deepEqual(parsed(value, { [variable]: "π/4" }), {
        concrete: false,
        radians,
        text,
      });
    });
  }

  it("still requires a value for an unresolved variable", () => {
    assert.throws(
      () => new AngleExpression("theta").radians(),
      new AngleExpressionError("unresolved angle variable: theta")
    );
  });

  it("evaluates a nested inverse-trig expression as real radians", () => {
    assert.ok(
      Math.abs(
        new AngleExpression("2*asin(1/sqrt(2))").radians() - Math.PI / 2
      ) < 1e-14
    );
  });

  for (const [source, expected] of [
    ["asin(0)", 0],
    ["asin(1)", Math.PI / 2],
    ["asin(-1)", -Math.PI / 2],
    ["acos(1)", 0],
    ["acos(0)", Math.PI / 2],
    ["acos(-1)", Math.PI],
    ["atan(0)", 0],
    ["atan(1)", Math.PI / 4],
    ["atan(-1)", -Math.PI / 4],
    ["sqrt(0)", 0],
    ["sqrt(4)", 2],
    ["atan(1/sqrt(3))", Math.PI / 6],
    ["pi/2-2*atan(1/3)", 0.9272952180016122],
    ["atan(1)+atan(1)/2", (3 * Math.PI) / 8],
    ["(atan(1)+atan(1))/2", Math.PI / 4],
    ["atan(8/4/2)", Math.PI / 4],
    ["-(-asin(1))", Math.PI / 2],
    ["2pi_3", (2 * Math.PI) / 3],
    ["1/pi_2", 2 / Math.PI],
    ["(2/pi)*asin(1/sqrt(6))*pi", 0.8410686705679303],
  ] as const) {
    it(`evaluates ${source} with principal real branches and normal precedence`, () => {
      assert.ok(
        Math.abs(new AngleExpression(source).radians() - expected) < 1e-14
      );
    });
  }

  it("evaluates declared variables without resolving global or prototype names", () => {
    const expression = new AngleExpression("asin(theta)");
    assert.equal(expression.concrete(), false);
    assert.ok(
      Math.abs(expression.radians({ theta: "1/2" }) - Math.PI / 6) < 1e-14
    );
    assert.throws(
      () => new AngleExpression("constructor").radians(),
      /unresolved angle variable/
    );
    assert.throws(() => expression.radians({ theta: "2" }), /asin domain/);
    assert.throws(
      () => expression.radians({ theta: "phi", phi: "1" }),
      /must be concrete/
    );
    assert.equal(new AngleExpression("asin").radians({ asin: "pi" }), Math.PI);
  });

  for (const [source, pattern] of [
    ["asin(1.01)", /asin domain/],
    ["acos(-1.01)", /acos domain/],
    ["sqrt(-1)", /sqrt domain/],
    ["theta+sqrt(-1)", /sqrt domain/],
    ["atan(1/0)", /division by zero/],
    ["pi_0", /division by zero/],
    ["9".repeat(400), /must be finite/],
    [`${"9".repeat(200)}*${"9".repeat(200)}`, /must be finite/],
    ["(".repeat(65) + "pi" + ")".repeat(65), /depth 64/],
    [" ".repeat(4097), /4096 characters/],
    ["θ".repeat(1000), /4096 characters/],
  ] as const) {
    it(`rejects invalid numeric values or limits: ${source.slice(0, 40)}`, () => {
      assert.throws(() => new AngleExpression(source).parse(), pattern);
    });
  }

  it("limits nodes independently of grouping depth and input length", () => {
    let source = "pi";
    for (let i = 0; i < 8; i++) source = `(${source}+${source})`;
    assert.throws(() => new AngleExpression(source).parse(), /256 nodes/);
  });

  for (const source of [
    "asin(1",
    "asin()",
    "asin(0,1)",
    "arcsin(1)",
    "Math.asin(1)",
    "process.exit(0)",
    "constructor(1)",
    "asin(1);0",
    "[1]",
    "1e3",
    "pi**2",
  ]) {
    it(`rejects non-grammar syntax without executing it: ${source}`, () => {
      assert.throws(
        () => new AngleExpression(source).parse(),
        AngleExpressionError
      );
    });
  }

  for (const source of [
    "1/(pi/2)",
    "pi-(pi-pi/3)",
    "-(atan(1)+pi/2)",
    "-(-asin(1))",
    "pi_2/3",
    "1/pi_2",
    "2pi_3",
  ]) {
    it(`preserves meaning through stored expression text: ${source}`, () => {
      const first = new AngleExpression(source);
      assert.ok(
        Math.abs(
          new AngleExpression(first.toString()).radians() - first.radians()
        ) < 1e-14
      );
    });
  }

  it("keeps a fractional pi alias grouped even when its denominator is numerically one", () => {
    assert.equal(new AngleExpression("1/pi_1.0").toString(), "1/(π/1.0)");
  });

  it("stores nested signs unambiguously without generating an option-looking prefix", () => {
    assert.equal(new AngleExpression("-(-asin(1))").toString(), "-(-asin(1))");
  });

  for (const value of ["sin(0)", "pi*", "pi//2", ""]) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      assert.throws(
        () => new AngleExpression(value).parse(),
        AngleExpressionError
      );
    });
  }
});

describe("validAngleIdentifier", () => {
  for (const name of ["pi", "pi_2"]) {
    it(`rejects ${name} because it is the circle constant`, () => {
      assert.equal(validAngleIdentifier(name), false);
    });
  }

  for (const name of ["theta", "alpha", "pix", "pi2", "_pi"]) {
    it(`accepts ${name}`, () => {
      assert.equal(validAngleIdentifier(name), true);
    });
  }
});
