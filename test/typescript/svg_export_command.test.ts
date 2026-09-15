import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

import { captureDispatcherRun, withTempDir } from "./helpers/command";

const TEMP_DIR_OPTIONS = { prefix: "qni-cli-svg-export-" };

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(
    path.join(dir, "circuit.json"),
    `${JSON.stringify(circuit, null, 2)}\n`
  );
}

interface InkBounds {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

function pngInkBounds(png: Buffer): InkBounds {
  const image = PNG.sync.read(png);
  let bottom = 0;
  let left = image.width;
  let right = 0;
  let top = image.height;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) {
        continue;
      }
      bottom = Math.max(bottom, y + 1);
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
    }
  }

  assert.ok(right > left && bottom > top, "expected rendered SVG ink");
  return { bottom, left, right, top };
}

function isolatedSvgInkBounds(
  svg: string,
  elementPattern: RegExp,
  cropY = 0
): InkBounds {
  const dimensions = svgDimensions(svg);
  const root = svg
    .split("\n")[0]
    .replace(
      /viewBox="[^"]+" width="\d+" height="\d+"/u,
      `viewBox="0 ${cropY} ${dimensions.width} 64" width="${dimensions.width}" height="64"`
    );
  const style = svg.split("\n")[1];
  const element = svg.split("\n").find((line) => elementPattern.test(line));

  assert.ok(element, `expected SVG element matching ${elementPattern}`);
  return pngInkBounds(
    new Resvg([root, style, element, "</svg>"].join("\n")).render().asPng()
  );
}

function numberAttribute(element: string, name: string): number {
  const match = new RegExp(`${name}="(?<value>[0-9.]+)"`, "u").exec(element);

  assert.ok(match?.groups);
  return Number(match.groups.value);
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function svgDimensions(svg: string): {
  readonly height: number;
  readonly width: number;
} {
  const match =
    /^<svg [^>]*width="(?<width>\d+)" height="(?<height>\d+)"/u.exec(svg);

  assert.ok(match?.groups);
  return {
    height: Number(match.groups.height),
    width: Number(match.groups.width),
  };
}

describe("SVG export command", () => {
  it("renders SVG directly without LaTeX tools", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [["H"]] });

      const result = captureDispatcherRun(dir, ["export", "--svg"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /^<svg /u);
      assert.match(result.stdout, /color:#fff/u);
      assert.match(result.stdout, /fill="#000"/u);
      assert.match(result.stdout, /data-operation="gate"/u);
      assert.match(result.stdout, />H<\/text>/u);
    }, TEMP_DIR_OPTIONS);
  });

  it("balances one-gate wire lengths and keeps the wire label nearby", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [["H"]] });

      const result = captureDispatcherRun(dir, ["export", "--svg"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.deepEqual(svgDimensions(result.stdout), {
        height: 64,
        width: 136,
      });
      assert.match(
        result.stdout,
        /data-operation="wire" data-qubit="0" x1="48" y1="32" x2="120" y2="32"/u
      );
      assert.match(
        result.stdout,
        /<rect class="gate-box" x="65" y="15" width="38" height="34"/u
      );
      assert.match(
        result.stdout,
        /<text x="84" y="37" text-anchor="middle">H<\/text>/u
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("keeps a four-digit qubit label clear of its wire", async () => {
    await withTempDir(async (dir) => {
      const qubit = 1000;
      const slots = Array.from(
        { length: qubit + 1 },
        () => 1 as string | number
      );
      slots[qubit] = "H";
      await writeCircuit(dir, { qubits: qubit + 1, cols: [slots] });

      const result = captureDispatcherRun(dir, ["export", "--svg", "--light"], {
        PATH: "",
      });
      const labelBounds = isolatedSvgInkBounds(
        result.stdout,
        new RegExp(`data-operation="wire-label" data-qubit="${qubit}"`, "u"),
        qubit * 64
      );
      const wire = result.stdout
        .split("\n")
        .find((line) =>
          line.includes(`data-operation="wire" data-qubit="${qubit}"`)
        );

      assert.equal(result.exitStatus, 0);
      assert.ok(wire);
      assert.ok(
        numberAttribute(wire, "x1") - labelBounds.right >= 8,
        `expected q${qubit} label to be at least 8px left of its wire`
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("places a long measurement name after the meter without clipping it", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["Measure>very_long_measurement_register_name"]],
      });

      const result = captureDispatcherRun(dir, ["export", "--svg", "--light"], {
        PATH: "",
      });
      const annotationBounds = isolatedSvgInkBounds(
        result.stdout,
        /class="annotation measurement-name"/u
      );
      const meter = result.stdout
        .split("\n")
        .find((line) => line.includes('<rect class="meter-box"'));
      const dimensions = svgDimensions(result.stdout);

      assert.equal(result.exitStatus, 0);
      assert.ok(meter);
      const meterRight =
        numberAttribute(meter, "x") + numberAttribute(meter, "width");
      assert.ok(
        annotationBounds.left - meterRight >= 4,
        "expected measurement name to start after the meter"
      );
      assert.ok(
        dimensions.width - annotationBounds.right >= 16,
        "expected measurement name to fit within the SVG viewport"
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("keeps seed-fixed generated labels and measurement names clear and unclipped", async () => {
    await withTempDir(async (dir) => {
      const random = seededRandom(0xd02);

      for (let index = 0; index < 8; index += 1) {
        const qubits =
          index < 4
            ? 1 + Math.floor(random() * 8)
            : 100 + Math.floor(random() * 1101);
        const measurementName = Array.from(
          { length: 4 + Math.floor(random() * 33) },
          () => "abcdefghijklmnopqrstuvwxyz_W"[Math.floor(random() * 29)]
        ).join("");
        const slots = Array.from(
          { length: qubits },
          () => 1 as string | number
        );
        slots[qubits - 1] = `Measure>${measurementName}`;
        await writeCircuit(dir, { qubits, cols: [slots] });

        const result = captureDispatcherRun(
          dir,
          ["export", "--svg", "--light"],
          { PATH: "" }
        );
        const cropY = (qubits - 1) * 64;
        const labelBounds = isolatedSvgInkBounds(
          result.stdout,
          new RegExp(
            `data-operation="wire-label" data-qubit="${qubits - 1}"`,
            "u"
          ),
          cropY
        );
        const annotationBounds = isolatedSvgInkBounds(
          result.stdout,
          /class="annotation measurement-name"/u,
          cropY
        );
        const lines = result.stdout.split("\n");
        const wire = lines.find((line) =>
          line.includes(`data-operation="wire" data-qubit="${qubits - 1}"`)
        );
        const meter = lines.find((line) =>
          line.includes('<rect class="meter-box"')
        );

        assert.equal(result.exitStatus, 0, `generated case ${index}`);
        assert.ok(wire && meter);
        assert.ok(
          numberAttribute(wire, "x1") - labelBounds.right >= 8,
          `generated case ${index}: label overlaps wire`
        );
        if (qubits <= 8) {
          assert.equal(
            numberAttribute(wire, "x1"),
            48,
            `generated case ${index}: ordinary wire placement changed`
          );
        }
        assert.ok(
          annotationBounds.left -
            (numberAttribute(meter, "x") + numberAttribute(meter, "width")) >=
            4,
          `generated case ${index}: measurement name overlaps meter`
        );
        assert.ok(
          svgDimensions(result.stdout).width - annotationBounds.right >= 16,
          `generated case ${index}: measurement name is clipped`
        );
      }
    }, TEMP_DIR_OPTIONS);
  });

  it("renders every supported SVG primitive and Unicode label", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 5,
        cols: [
          ["H", "P(π/2)", "S†", "X^½", "Measure>result"],
          ["•", "•", 1, 1, "X<input"],
          ["•", 1, "Swap", 1, "Swap"],
        ],
      });

      const result = captureDispatcherRun(
        dir,
        ["export", "--svg", "--light", "--output", "nested/circuit.svg"],
        { PATH: "" }
      );
      const svg = await readFile(
        path.join(dir, "nested", "circuit.svg"),
        "utf8"
      );

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.match(svg, /color:#111/u);
      for (const operation of [
        "wire",
        "wire-label",
        "gate",
        "control",
        "control-line",
        "cnot-target",
        "swap",
        "measurement",
      ]) {
        assert.match(
          svg,
          new RegExp(`data-operation="${operation}"`, "u"),
          operation
        );
      }
      for (const label of ["P(π/2)", "S†", "√X", "&gt;result", "&lt;input"]) {
        assert.ok(svg.includes(label), label);
      }
      assert.match(svg, /class="meter-mark"/u);
      assert.match(svg, /class="swap-mark"/u);
      assert.match(svg, /data-qubit="4"/u);
    }, TEMP_DIR_OPTIONS);
  });

  it("masks wires inside ordinary gates, controlled gates, and measurements", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [
          ["H", 1, 1],
          ["•", "H", "Measure"],
        ],
      });

      const result = captureDispatcherRun(dir, ["export", "--svg", "--light"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.match(
        result.stdout,
        /<g data-operation="gate" data-step="0" data-qubit="0">\n<rect class="gate-box"[^>]* fill="#fff"/u
      );
      assert.match(
        result.stdout,
        /<g data-operation="gate" data-step="1" data-qubit="1">\n<rect class="gate-box"[^>]* fill="#fff"/u
      );
      assert.match(
        result.stdout,
        /<g data-operation="measurement" data-step="1" data-qubit="2">\n<rect class="meter-box"[^>]* fill="#fff"/u
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("expands the SVG viewport for long top and bottom captions", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 1, cols: [["H"]] });
      const caption = "A caption that is wider than a one-gate circuit";

      for (const position of ["top", "bottom"]) {
        const result = captureDispatcherRun(
          dir,
          [
            "export",
            "--svg",
            "--light",
            "--caption",
            caption,
            "--caption-position",
            position,
            "--caption-size",
            "48",
          ],
          { PATH: "" }
        );
        const dimensions = svgDimensions(result.stdout);

        assert.equal(result.exitStatus, 0);
        assert.match(result.stdout, /font-size:48pt/u);
        assert.deepEqual(dimensions, { height: 180, width: 3040 }, position);
        assert.match(
          result.stdout,
          new RegExp(`data-caption-position="${position}"`, "u")
        );
      }
    }, TEMP_DIR_OPTIONS);
  });

  it("keeps SVG placements and connections aligned with the ASCII circuit", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 5,
        cols: [
          ["•", 1, "•", 1, "X"],
          [1, "Swap", 1, "Swap", "•"],
        ],
      });

      const ascii = captureDispatcherRun(dir, ["view"], { PATH: "" });
      const svg = captureDispatcherRun(dir, ["export", "--svg"], { PATH: "" });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: ──■──/u);
      assert.match(ascii.stdout, /q2: ──■──/u);
      assert.match(ascii.stdout, /q4: ┤ X ├/u);
      assert.match(ascii.stdout, /q1: .*X/u);
      assert.match(ascii.stdout, /q3: .*X/u);
      assert.match(
        svg.stdout,
        /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="4"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="control" data-step="0" data-qubit="2" data-target-qubit="4"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="control-line" data-step="0" data-from-qubit="0" data-to-qubit="4"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="cnot-target" data-step="0" data-qubit="4"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="swap" data-step="1" data-qubit="1" data-pair-qubit="3"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="swap" data-step="1" data-qubit="3" data-pair-qubit="1"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="control-line" data-step="1" data-from-qubit="1" data-to-qubit="4"/u
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("keeps an independent measurement beside a controlled gate in ASCII and SVG", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 3, cols: [["•", "H", "Measure"]] });

      const ascii = captureDispatcherRun(dir, ["view"], { PATH: "" });
      const svg = captureDispatcherRun(dir, ["export", "--svg"], { PATH: "" });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: .*■/u);
      assert.match(ascii.stdout, /q1: .*H/u);
      assert.match(ascii.stdout, /q2: .*Measure/u);
      assert.match(
        svg.stdout,
        /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="1"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="gate" data-step="0" data-qubit="1"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="measurement" data-step="0" data-qubit="2"/u
      );
    }, TEMP_DIR_OPTIONS);
  });

  it("keeps an independent measurement inside a control span in ASCII and SVG", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, { qubits: 3, cols: [["•", "Measure", "H"]] });

      const ascii = captureDispatcherRun(dir, ["view"], { PATH: "" });
      const svg = captureDispatcherRun(dir, ["export", "--svg"], { PATH: "" });

      assert.equal(ascii.exitStatus, 0);
      assert.match(ascii.stdout, /q0: .*■/u);
      assert.match(ascii.stdout, /┌────│────┐/u);
      assert.match(ascii.stdout, /q1: .*Measure/u);
      assert.match(ascii.stdout, /└──┬─┴─┬──┘/u);
      assert.match(ascii.stdout, /q2: .*H/u);
      assert.match(
        svg.stdout,
        /data-operation="control" data-step="0" data-qubit="0" data-target-qubit="2"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="measurement" data-step="0" data-qubit="1"/u
      );
      assert.match(
        svg.stdout,
        /data-operation="gate" data-step="0" data-qubit="2"/u
      );
    }, TEMP_DIR_OPTIONS);
  });
});
