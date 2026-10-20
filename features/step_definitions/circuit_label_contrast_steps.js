const assert = require("node:assert/strict");

const { Given, Then, When } = require("@cucumber/cucumber");
const { PNG } = require("pngjs");

const { registerQniToolsExtension } = require("../support/qni_tools_extension");

Given(
  "端末の前景色 {string}、背景色 {string}、Pi の文字色 {string} で qni ツール拡張を登録する",
  async function (foreground, background, themeColor) {
    await registerQniToolsExtension(this, {
      terminalBackground: background,
      terminalForeground: foreground,
      textColor: ansiFromHex(themeColor),
    });
  }
);

Given(
  "端末の前景色 {string}、背景色 {string}、不明な Pi の文字色で qni ツール拡張を登録する",
  async function (foreground, background) {
    await registerQniToolsExtension(this, {
      terminalBackground: background,
      terminalForeground: foreground,
      textColor: "\x1b[37m",
    });
  }
);

When("qni ツールで SWAP を表示する", async function () {
  await executeQniTool(this, ["add", "SWAP", "--qubit", "0,1", "--step", "0"]);
  this.qniToolResult = await executeQniTool(this, ["view"]);
});

Then("回路図の量子ビットラベルは {string} で描かれる", function (color) {
  assert.equal(circuitInkColor(this, "wire-label"), color);
});

Then("回路図の配線は {string} で描かれる", function (color) {
  assert.equal(circuitInkColor(this, "wire"), color);
});

Then("回路図の SWAP の線は {string} で描かれる", function (color) {
  assert.equal(circuitInkColor(this, "swap-line"), color);
});

function ansiFromHex(color) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/iu.exec(color);
  assert.ok(match, `expected #rrggbb theme color, got ${color}`);
  return `\x1b[38;2;${match
    .slice(1)
    .map((channel) => Number.parseInt(channel, 16))
    .join(";")}m`;
}

function qniTool(world) {
  const tool = world.qniToolsTools.get("qni");
  assert.ok(tool, "expected qni-tools to register the qni tool");
  return tool;
}

async function executeQniTool(world, args) {
  const result = await qniTool(world).execute(
    "qni-tool-call",
    { args },
    undefined,
    undefined,
    { cwd: world.scenarioDir }
  );
  const actualWorkdir = result?.details?.workdir;
  if (
    typeof actualWorkdir === "string" &&
    !actualWorkdir.startsWith(world.scenarioDir)
  ) {
    world.tempDirs = [...(world.tempDirs ?? []), actualWorkdir];
  }
  return result;
}

function renderQniToolResult(world) {
  const theme = {
    fg: (color, text) =>
      color === "toolOutput" ? `\x1b[38;2;87;86;83m${text}\x1b[39m` : text,
  };
  return qniTool(world).renderResult(
    world.qniToolResult,
    { expanded: false, isPartial: false },
    theme,
    { args: {}, showImages: true }
  );
}

function circuitInkColor(world, operation) {
  const svg = world.qniToolResult.details.circuitSvg;
  const element = svg
    .split("\n")
    .find((line) => line.includes(`data-operation="${operation}"`));
  assert.ok(element, `expected ${operation} in the circuit SVG`);
  const png = circuitPng(world);
  const image = PNG.sync.read(png);
  const region = inkRegion(operation, element, image);
  const counts = new Map();
  for (let y = region.top; y < region.bottom; y += 1) {
    for (let x = region.left; x < region.right; x += 1) {
      const index = (image.width * y + x) * 4;
      if (image.data[index + 3] < 250) continue;
      const pixel = `#${[0, 1, 2]
        .map((channel) =>
          image.data[index + channel].toString(16).padStart(2, "0")
        )
        .join("")}`;
      counts.set(pixel, (counts.get(pixel) ?? 0) + 1);
    }
  }
  let color;
  let count = 0;
  for (const [pixel, pixelCount] of counts) {
    if (pixelCount > count) {
      color = pixel;
      count = pixelCount;
    }
  }
  assert.ok(
    color,
    `expected opaque ${operation} pixels in ${JSON.stringify(region)}, png ${image.width}x${image.height}`
  );
  return color;
}

function circuitPng(world) {
  const { Image } = require("@earendil-works/pi-tui");
  const component = renderQniToolResult(world);
  assert.ok(component instanceof Image);
  assert.equal(typeof component.base64Data, "string");
  return Buffer.from(component.base64Data, "base64");
}

function inkRegion(operation, element, image) {
  if (operation === "wire-label") {
    const x = numberAttribute(element, "x");
    const y = numberAttribute(element, "y");
    return clampRegion(image, x, y - 12, x + 24, y);
  }
  if (operation === "swap-line") {
    const x = numberAttribute(element, "x1");
    const y = Math.round(
      (numberAttribute(element, "y1") + numberAttribute(element, "y2")) / 2
    );
    return clampRegion(image, x - 1, y, x + 2, y + 1);
  }
  const x = numberAttribute(element, "x1") + 6;
  const y = numberAttribute(element, "y1");
  return clampRegion(image, x, y - 1, x + 4, y + 2);
}

function clampRegion(image, left, top, right, bottom) {
  return {
    left: Math.max(0, Math.floor(left)),
    top: Math.max(0, Math.floor(top)),
    right: Math.min(image.width, Math.ceil(right)),
    bottom: Math.min(image.height, Math.ceil(bottom)),
  };
}

function numberAttribute(element, name) {
  const match = new RegExp(`${name}="(?<value>[0-9.]+)"`, "u").exec(element);
  assert.ok(match?.groups, `expected ${name} on ${element}`);
  return Number(match.groups.value);
}
