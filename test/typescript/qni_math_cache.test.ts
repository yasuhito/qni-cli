import assert from "node:assert/strict";
import test from "node:test";

import { RenderCache } from "../../src/qni-math/cache";

function image(value: string): { svg: string; png: Buffer } {
  return { svg: value, png: Buffer.from(value) };
}

test("キャッシュの件数上限を超えると最も古く使われた画像を捨てる", () => {
  const cache = new RenderCache(2, 1_000);
  let renders = 0;
  const render = (value: string) => cache.getOrCreate(value, () => {
    renders += 1;
    return image(value);
  });

  render("old");
  render("kept");
  render("old");
  render("new");
  render("kept");

  assert.equal(renders, 4);
  assert.equal(cache.stats().entries, 2);
});

test("キャッシュのバイト上限を超えると古い画像を捨てる", () => {
  const cache = new RenderCache(10, 8);
  cache.getOrCreate("a", () => image("aaaa"));
  cache.getOrCreate("b", () => image("bbbb"));

  assert.deepEqual(cache.stats(), { entries: 1, bytes: 8 });
});

test("組版の失敗を記録して同じ入力を再試行しない", () => {
  const cache = new RenderCache(10, 1_000);
  let attempts = 0;
  const fail = () => cache.getOrCreate("invalid", () => {
    attempts += 1;
    throw new Error("Invalid LaTeX");
  });

  assert.equal(fail(), undefined);
  assert.equal(fail(), undefined);
  assert.equal(attempts, 1);
  assert.equal(cache.stats().lastFailure, "Invalid LaTeX");
});

test("画像配置の失敗を記録して再試行を止める", () => {
  const cache = new RenderCache(10, 1_000);
  cache.recordFailure("placement", new Error("Too many rows"));

  assert.equal(cache.hasFailure("placement"), true);
  assert.equal(cache.stats().lastFailure, "Too many rows");
});
