const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { Then } = require("@cucumber/cucumber");

const PYTHON_SYMBOLIC = path.join(
  process.cwd(),
  ".python-symbolic",
  "bin",
  "python"
);

function pngBackgroundColor(actualPath) {
  const script = `
from PIL import Image
import json
import sys

image = Image.open(sys.argv[1]).convert("RGBA")
print(json.dumps("#%02x%02x%02x" % image.getpixel((0, 0))[:3]))
`;
  return JSON.parse(
    execFileSync(PYTHON_SYMBOLIC, ["-c", script, actualPath], {
      encoding: "utf8",
    })
  );
}

function pngHasVisibleInk(actualPath) {
  const script = `
from PIL import Image
import json
import sys

image = Image.open(sys.argv[1]).convert("RGBA")
pixels = image.load()
width, height = image.size
background = pixels[0, 0][:3]
print(json.dumps(any(
    pixels[x, y][:3] != background and pixels[x, y][3] > 0
    for y in range(height)
    for x in range(width)
)))
`;
  return JSON.parse(
    execFileSync(PYTHON_SYMBOLIC, ["-c", script, actualPath], {
      encoding: "utf8",
    })
  );
}

function pngInkMargins(actualPath) {
  const script = `
from PIL import Image, ImageChops
import json
import sys

image = Image.open(sys.argv[1]).convert("RGB")
background = Image.new("RGB", image.size, image.getpixel((0, 0)))
bounds = ImageChops.difference(image, background).getbbox()
assert bounds is not None
left, top, right, bottom = bounds
print(json.dumps({
    "bottom": image.height - bottom,
    "left": left,
    "right": image.width - right,
    "top": top
}))
`;
  return JSON.parse(
    execFileSync(PYTHON_SYMBOLIC, ["-c", script, actualPath], {
      encoding: "utf8",
    })
  );
}

Then("{string} の背景色は {string} である", function (filePath, color) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assert.equal(pngBackgroundColor(actualPath), color.toLowerCase());
});

Then("{string} は背景と異なる可視ピクセルを含む", function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assert.equal(pngHasVisibleInk(actualPath), true);
});

Then(
  "{string} の四辺のインク余白は {int}px 以上 {int}px 以下である",
  function (filePath, minimum, maximum) {
    const actualPath = path.join(this.scenarioDir, filePath);

    assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
    for (const [edge, margin] of Object.entries(pngInkMargins(actualPath))) {
      assert.ok(
        margin >= minimum && margin <= maximum,
        `expected ${edge} ink margin to be ${minimum}..${maximum}px, got ${margin}px`
      );
    }
  }
);
