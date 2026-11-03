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

  for (const value of ["atan(1/sqrt(5))", "pi*", "1/pi", ""]) {
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
