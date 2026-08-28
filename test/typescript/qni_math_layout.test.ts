import assert from "node:assert/strict";
import test from "node:test";

import { calculateRasterLayout } from "../../src/qni-math/layout";

const cell = { widthPx: 9, heightPx: 18 };

test("表示数式の列数と行数を端末セル寸法から求める", () => {
  assert.deepEqual(calculateRasterLayout(181, 37, true, 80, cell), {
    widthPx: 181,
    heightPx: 37,
    columns: 21,
    rows: 3,
    scale: 1
  });
});

test("インライン数式を端末セル 1 行の高さへ縮める", () => {
  assert.deepEqual(calculateRasterLayout(181, 37, false, 80, cell), {
    widthPx: 88,
    heightPx: 18,
    columns: 10,
    rows: 1,
    scale: 18 / 37
  });
});

test("表示数式は利用可能幅を超えるときだけ縮める", () => {
  assert.deepEqual(calculateRasterLayout(900, 90, true, 50, cell), {
    widthPx: 450,
    heightPx: 45,
    columns: 50,
    rows: 3,
    scale: 0.5
  });
});
