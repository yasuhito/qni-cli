import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { createDispatcher } from "../../src/dispatcher";

interface CapturedRun {
  readonly exitStatus: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface PngStableProperties {
  readonly height: number;
  readonly transparent: boolean;
  readonly width: number;
}

interface PngMargins {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

async function withTempDir<T>(
  callback: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "qni-cli-export-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

function captureDispatcherRun(
  cwd: string,
  argv: string[],
  env: NodeJS.ProcessEnv = { ...process.env }
): CapturedRun {
  let stdout = "";
  let stderr = "";
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean => {
    stdout += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : chunk.toString();
    if (typeof encodingOrCallback === "function") {
      encodingOrCallback();
    }
    if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: BufferEncoding | ((error?: Error | null) => void)
  ): boolean => {
    stderr += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : chunk.toString();
    if (typeof encodingOrCallback === "function") {
      encodingOrCallback();
    }
    if (typeof callback === "function") {
      callback();
    }
    return true;
  }) as typeof process.stderr.write;

  try {
    const dispatcher = createDispatcher({
      cwd,
      env,
      projectRoot: process.cwd(),
    });

    return {
      exitStatus: dispatcher.run(argv),
      stderr,
      stdout,
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

async function writeCircuit(dir: string, circuit: unknown): Promise<void> {
  await writeFile(
    path.join(dir, "circuit.json"),
    `${JSON.stringify(circuit, null, 2)}\n`
  );
}

async function pngStableProperties(
  filePath: string
): Promise<PngStableProperties> {
  const png = await readFile(filePath);
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  assert.deepEqual(png.subarray(0, 8), signature);
  assert.equal(png.toString("ascii", 12, 16), "IHDR");

  return {
    height: png.readUInt32BE(20),
    transparent:
      pngColorTypeHasAlpha(png) ||
      pngChunks(png).some((chunk) => chunk.type === "tRNS"),
    width: png.readUInt32BE(16),
  };
}

function pngColorTypeHasAlpha(png: Buffer): boolean {
  return png[25] === 4 || png[25] === 6;
}

function pngInkMargins(filePath: string): PngMargins {
  const script = [
    "import json, sys",
    "from PIL import Image, ImageChops",
    'image = Image.open(sys.argv[1]).convert("RGBA")',
    'alpha = image.getchannel("A")',
    'bounds = alpha.getbbox() if alpha.getextrema()[0] < 255 else ImageChops.difference(image.convert("RGB"), Image.new("RGB", image.size, image.getpixel((0, 0))[:3])).getbbox()',
    "assert bounds is not None",
    "left, top, right, bottom = bounds",
    'print(json.dumps({"bottom": image.height - bottom, "left": left, "right": image.width - right, "top": top}))',
  ].join("\n");
  const python = path.join(process.cwd(), ".python-symbolic", "bin", "python");
  const output = execFileSync(python, ["-c", script, filePath], {
    encoding: "utf8",
  });

  return JSON.parse(output) as PngMargins;
}

function assertBalancedInkMargins(filePath: string, context: string): void {
  for (const [edge, margin] of Object.entries(pngInkMargins(filePath))) {
    assert.ok(
      margin >= 15 && margin <= 17,
      `${context}: expected ${edge} ink margin near 16px, got ${margin}px`
    );
  }
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

function pngChunks(png: Buffer): Array<{ readonly type: string }> {
  const chunks: Array<{ readonly type: string }> = [];
  let offset = 8;

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataEnd = offset + 8 + length;

    assert.ok(dataEnd + 4 <= png.length, `expected complete PNG chunk ${type}`);
    chunks.push({ type });
    offset = dataEnd + 4;

    if (type === "IEND") {
      break;
    }
  }

  return chunks;
}

async function pathWithOnly(
  parentDir: string,
  commands: string[]
): Promise<string> {
  const dir = path.join(parentDir, `path-${commands.join("-")}`);

  await rm(dir, { force: true, recursive: true });
  await mkdir(dir, { recursive: true });

  for (const command of commands) {
    await symlink(commandPath(command), path.join(dir, command));
  }

  return dir;
}

function commandPath(command: string): string {
  return execFileSync("bash", ["-lc", 'command -v -- "$1"', "bash", command], {
    encoding: "utf8",
  }).trim();
}

describe("export command TypeScript route", () => {
  it("renders quantikz LaTeX source for controlled and swap operations", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [
          ["•", "X", 1],
          [1, "Swap", "Swap"],
          ["•", "Swap", "Swap"],
        ],
      });

      const result = captureDispatcherRun(dir, ["export", "--latex-source"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /\\usepackage\{quantikz\}/u);
      assert.match(result.stdout, /\\begin\{quantikz\}/u);
      assert.match(result.stdout, /\\ctrl\{1\}/u);
      assert.match(result.stdout, /\\swap\{1\}/u);
      assert.match(result.stdout, /\\targX\{\}/u);
    });
  });

  it("renders measurement alongside controlled and SWAP operations in the same step", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [
          ["•", "X", "Measure"],
          ["Swap", "Swap", "Measure"],
        ],
      });

      const result = captureDispatcherRun(dir, ["export", "--latex-source"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /\\meter/u);
      assert.match(result.stdout, /\\ctrl\{1\}/u);
      assert.match(result.stdout, /\\swap\{1\}/u);
    });
  });

  it("uses contrasting quantikz gate fills for dark and light themes", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const dark = captureDispatcherRun(dir, ["export", "--latex-source"], {
        PATH: "",
      });
      const light = captureDispatcherRun(
        dir,
        ["export", "--latex-source", "--light"],
        { PATH: "" }
      );

      assert.equal(dark.exitStatus, 0);
      assert.match(dark.stdout, /\\color\{white\}/u);
      assert.match(dark.stdout, /background color=black/u);
      assert.equal(light.exitStatus, 0);
      assert.match(light.stdout, /\\color\{black\}/u);
      assert.match(light.stdout, /background color=white/u);
    });
  });

  it("keeps uncaptioned quantikz output tight and vertically balanced", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(
        dir,
        ["export", "--latex-source", "--light"],
        { PATH: "" }
      );

      assert.equal(result.exitStatus, 0);
      assert.match(
        result.stdout,
        /\\documentclass\[border=\{1px 5px 1px 5px\}\]\{standalone\}/u
      );
      assert.doesNotMatch(result.stdout, /\\begin\{tabular\}/u);
      assert.match(
        result.stdout,
        /\\lstick\{\$q0: \\ket\{0\}\$\} & \\gate\{\\mathrm\{H\}\} & \\qw\n\\end\{quantikz\}/u
      );
    });
  });

  it("renders captioned light-theme LaTeX source", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(
        dir,
        [
          "export",
          "--latex-source",
          "--caption",
          "π & CNOT",
          "--caption-position",
          "top",
          "--light",
        ],
        { PATH: "" }
      );

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /\$\\pi\$ \\& CNOT/u);
      assert.match(result.stdout, /\\begin\{quantikz\}/u);
    });
  });

  it("rejects malformed --caption-size values", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      for (const value of [
        "1abc",
        "abc",
        "NaN",
        "Infinity",
        "0x10",
        "5.",
        "-1",
        "-1.5",
        ".5",
      ]) {
        const result = captureDispatcherRun(
          dir,
          ["export", "--latex-source", "--caption-size", value],
          { PATH: "" }
        );

        assert.equal(result.exitStatus, 1, value);
        assert.equal(result.stdout, "", value);
        assert.match(result.stderr, /--caption-size/u, value);
      }
    });
  });

  it("reports malformed controlled and swap steps", async () => {
    await withTempDir(async (dir) => {
      for (const [circuit, message] of [
        [
          {
            qubits: 3,
            cols: [["•", "H", "X"]],
          },
          "unsupported controlled step",
        ],
        [
          {
            qubits: 3,
            cols: [["Swap", "Swap", "H"]],
          },
          "unsupported swap step",
        ],
      ] as const) {
        await writeCircuit(dir, circuit);

        const result = captureDispatcherRun(dir, ["export", "--latex-source"], {
          PATH: "",
        });

        assert.equal(result.exitStatus, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, new RegExp(message, "u"));
      }
    });
  });

  it("writes LaTeX source to --output without stdout", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["T†"]],
      });

      const result = captureDispatcherRun(
        dir,
        ["export", "--latex-source", "--output", "nested/circuit.tex"],
        {
          PATH: "",
        }
      );
      const output = await readFile(
        path.join(dir, "nested", "circuit.tex"),
        "utf8"
      );

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.match(output, /\\begin\{quantikz\}/u);
      assert.match(output, /T/u);
    });
  });

  it("exports a complex state-vector PNG through the legacy symbolic LaTeX format", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"], ["T"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--state-vector",
        "--png",
        "--light",
        "--output",
        "state.png",
      ]);
      const statePng = await pngStableProperties(path.join(dir, "state.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(statePng.transparent, true);
      assert.ok(statePng.width > 0);
      assert.ok(statePng.height > 0);
    });
  });

  it("exports circle-notation PNG through the retained Python helper contract", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [[1, 1]],
        initial_state: {
          format: "ket_sum_v1",
          terms: [{ basis: "Φ+", coefficient: "1" }],
        },
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--circle-notation",
        "--png",
        "--light",
        "--output",
        "circles.png",
      ]);
      const circlePng = await pngStableProperties(
        path.join(dir, "circles.png")
      );

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(circlePng.transparent, true);
      assert.ok(circlePng.width > 0);
      assert.ok(circlePng.height > 0);
    });
  });

  it("writes distinct state-vector and circle-notation PNG contents on the TypeScript route", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [[1, 1]],
        initial_state: {
          format: "ket_sum_v1",
          terms: [{ basis: "Φ+", coefficient: "1" }],
        },
      });

      const circleResult = captureDispatcherRun(dir, [
        "export",
        "--circle-notation",
        "--png",
        "--output",
        "circles.png",
      ]);
      const stateResult = captureDispatcherRun(dir, [
        "export",
        "--state-vector",
        "--png",
        "--output",
        "state.png",
      ]);

      assert.equal(circleResult.exitStatus, 0);
      assert.equal(circleResult.stdout, "");
      assert.equal(circleResult.stderr, "");
      assert.equal(stateResult.exitStatus, 0);
      assert.equal(stateResult.stdout, "");
      assert.equal(stateResult.stderr, "");
      assert.notDeepEqual(
        await readFile(path.join(dir, "circles.png")),
        await readFile(path.join(dir, "state.png"))
      );
    });
  });

  it("prints export help", async () => {
    await withTempDir(async (dir) => {
      const result = captureDispatcherRun(dir, ["export", "--help"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stderr, "");
      assert.match(
        result.stdout,
        /qni export --latex-source \[--output=PATH\]/u
      );
      assert.match(
        result.stdout,
        /qni export --circle-notation --png --output=PATH/u
      );
    });
  });

  it("renders regular transparent PNG through TypeScript subprocesses", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--output",
        "circuit.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "circuit.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.deepEqual(png, { height: 66, transparent: true, width: 158 });
    });
  });

  it("renders controlled SWAP as a regular PNG", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 3,
        cols: [["•", "Swap", "Swap"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--output",
        "swap.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "swap.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.deepEqual(png, { height: 152, transparent: true, width: 135 });
    });
  });

  it("renders regular opaque PNG with balanced margins", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--no-transparent",
        "--output",
        "circuit.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "circuit.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.deepEqual(png, { height: 66, transparent: false, width: 158 });

      assertBalancedInkMargins(
        path.join(dir, "circuit.png"),
        "uncaptioned circuit"
      );
    });
  });

  it("sizes an empty regular PNG from the rendered quantikz columns", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--output",
        "empty.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "empty.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.deepEqual(png, { height: 56, transparent: true, width: 149 });
    });
  });

  it("renders caption PNG", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [["•", "X"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--caption",
        "CNOT before cut",
        "--caption-position",
        "top",
        "--output",
        "caption.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "caption.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(png.transparent, true);
      assert.ok(png.height > 64);
      assert.ok(png.width >= 64);
    });
  });

  it("renders caption opaque PNG", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [["•", "X"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--caption",
        "CNOT before cut",
        "--no-transparent",
        "--output",
        "caption.png",
      ]);
      const png = await pngStableProperties(path.join(dir, "caption.png"));

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(png.transparent, false);
      assert.ok(png.height > 64);
      assert.ok(png.width >= 64);

      for (const margin of Object.values(
        pngInkMargins(path.join(dir, "caption.png"))
      )) {
        assert.ok(
          margin >= 15 && margin <= 19,
          `expected a 16px margin, got ${margin}px`
        );
      }
    });
  });

  it("keeps adversarial caption ink margins balanced across size and position", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [["•", "X"]],
      });

      const captions = [
        { caption: "gyp jq", position: "bottom", size: 24 },
        { caption: "gyp", position: "top", size: 8 },
        { caption: "HI TALL", position: "bottom", size: 12 },
        { caption: "Wide caption text", position: "bottom", size: 12 },
      ] as const;

      for (const { caption, position, size } of captions) {
        const output = `caption-${position}-${size}-${caption.length}.png`;
        const result = captureDispatcherRun(dir, [
          "export",
          "--png",
          "--light",
          "--no-transparent",
          "--caption",
          caption,
          "--caption-position",
          position,
          "--caption-size",
          String(size),
          "--output",
          output,
        ]);

        assert.equal(result.exitStatus, 0, `${position} ${size}pt ${caption}`);
        assertBalancedInkMargins(
          path.join(dir, output),
          `${position} ${size}pt ${caption}`
        );
      }
    });
  });

  it("keeps transparent caption ink margins balanced", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 2,
        cols: [["•", "X"]],
      });

      const result = captureDispatcherRun(dir, [
        "export",
        "--png",
        "--light",
        "--caption",
        "gyp jq",
        "--caption-position",
        "bottom",
        "--caption-size",
        "24",
        "--output",
        "transparent-caption.png",
      ]);

      assert.equal(result.exitStatus, 0);
      assertBalancedInkMargins(
        path.join(dir, "transparent-caption.png"),
        "transparent caption"
      );
    });
  });

  it("keeps seed-fixed generated caption PNG margins balanced", async () => {
    await withTempDir(async (dir) => {
      const random = seededRandom(0xd02);
      const alphabet = "ABCDEFGHabcdefghijklmnpqyg_ ";

      for (let index = 0; index < 8; index += 1) {
        const qubits = 1 + Math.floor(random() * 8);
        const slots = Array.from(
          { length: qubits },
          () => 1 as string | number
        );
        slots[Math.floor(random() * qubits)] = "H";
        await writeCircuit(dir, { qubits, cols: [slots] });
        const caption = Array.from(
          { length: 3 + Math.floor(random() * 22) },
          () => alphabet[Math.floor(random() * alphabet.length)]
        ).join("");
        const position = random() < 0.5 ? "top" : "bottom";
        const size = 8 + Math.floor(random() * 21);
        const output = `generated-caption-${index}.png`;
        const result = captureDispatcherRun(dir, [
          "export",
          "--png",
          ...(index % 2 === 0 ? ["--light"] : []),
          "--no-transparent",
          "--caption",
          caption,
          "--caption-position",
          position,
          "--caption-size",
          String(size),
          "--output",
          output,
        ]);

        assert.equal(result.exitStatus, 0, `generated case ${index}`);
        assertBalancedInkMargins(
          path.join(dir, output),
          `generated case ${index}: ${position} ${size}pt ${caption}`
        );
      }
    });
  });

  it("reports missing pdflatex", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const missingPdfLatexPath = await pathWithOnly(dir, []);
      const result = captureDispatcherRun(
        dir,
        ["export", "--png", "--output", "circuit.png"],
        { PATH: missingPdfLatexPath }
      );

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr,
        "pdflatex is required for qni export --png\n"
      );
    });
  });

  it("reports pdflatex spawn errors with the underlying cause", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const pathDir = path.join(dir, "path-denied-pdflatex");
      const pdfLatexPath = path.join(pathDir, "pdflatex");

      await mkdir(pathDir, { recursive: true });
      await writeFile(pdfLatexPath, "#!/bin/sh\n");
      await chmod(pdfLatexPath, 0o644);

      const result = captureDispatcherRun(
        dir,
        ["export", "--png", "--output", "circuit.png"],
        { PATH: pathDir }
      );

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^pdflatex failed: .*EACCES\n$/u);
    });
  });

  it("reports missing pdftocairo", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const missingPdfToCairoPath = await pathWithOnly(dir, ["pdflatex"]);
      const result = captureDispatcherRun(
        dir,
        ["export", "--png", "--output", "circuit.png"],
        { PATH: missingPdfToCairoPath }
      );

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr,
        "pdftocairo is required for qni export --png\n"
      );
    });
  });

  it("rejects unknown options", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(dir, ["export", "--bad"], {
        PATH: "",
      });

      assert.equal(result.exitStatus, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr,
        'ERROR: "qni export" was called with arguments ["--bad"]\nUsage: "qni export"\n'
      );
    });
  });

  it("handles value-like option ambiguity", async () => {
    await withTempDir(async (dir) => {
      await writeCircuit(dir, {
        qubits: 1,
        cols: [["H"]],
      });

      const result = captureDispatcherRun(
        dir,
        ["export", "--latex-source", "--output", "--light"],
        { PATH: "" }
      );

      assert.equal(result.exitStatus, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.match(
        await readFile(path.join(dir, "output"), "utf8"),
        /\\begin\{quantikz\}/u
      );
    });
  });
});
