import assert from "node:assert/strict";
import test from "node:test";

import { typesetMath } from "../../src/qni-math/typesetter";

const CELL = { widthPx: 8, heightPx: 16 };

function renderedSvg(latex: string): string {
  return typesetMath(latex, "#100f0f", 80, CELL).svg
    .replace(/(<g data-mml-node="math") data-latex="[^"]*"/u, "$1");
}

test("braket の直後の項を braket の外側に組版する", () => {
  assert.equal(
    renderedSvg("\\braket{s|\\psi} - \\ket{\\psi}"),
    renderedSvg("\\left\\langle s|\\psi\\right\\rangle - \\left|\\psi\\right\\rangle")
  );
});

test("ket を縦棒と右山括弧で組版する", () => {
  assert.equal(
    renderedSvg("\\ket{\\psi}"),
    renderedSvg("\\left|\\psi\\right\\rangle")
  );
});

test("bra を左山括弧と縦棒で組版する", () => {
  assert.equal(
    renderedSvg("\\bra{s}"),
    renderedSvg("\\left\\langle s\\right|")
  );
});
