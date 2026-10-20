import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CircuitSvg } from "../../src/export/circuit_svg";
import {
  resolveCircuitColor,
  rgbFromAnsi,
} from "../../src/qni-tools/circuit-color";
import {
  queryTerminalBackground,
  queryTerminalForeground,
  skipsTerminalColorQuery,
  type TerminalUi,
} from "../../src/qni-tools/terminal-colors";

const hadamard = { qubits: 1, cols: [["H"]] };

describe("circuit ink color", () => {
  it("reads a truecolor ANSI color", () => {
    assert.equal(rgbFromAnsi("\x1b[38;2;16;15;13m"), "#100f0d");
    assert.equal(rgbFromAnsi("\x1b[37m"), undefined);
  });

  it("keeps a theme color that contrasts with the terminal background", () => {
    assert.deepEqual(
      resolveCircuitColor("#100f0d", {
        foreground: "#100f0d",
        background: "#fffcf0",
      }),
      { value: "#100f0d", source: "Pi theme" }
    );
  });

  it("uses the theme color at the contrast boundary of 2", () => {
    assert.equal(
      resolveCircuitColor("#b7b7b7", {
        foreground: "#111111",
        background: "#ffffff",
      }).source,
      "Pi theme"
    );
    assert.equal(
      resolveCircuitColor("#b8b8b8", {
        foreground: "#111111",
        background: "#ffffff",
      }).value,
      "#111111"
    );
  });

  it("uses the terminal foreground when the theme color blends into the background", () => {
    assert.deepEqual(
      resolveCircuitColor("#fffcf0", {
        foreground: "#100f0d",
        background: "#fffcf0",
      }),
      { value: "#100f0d", source: "terminal foreground" }
    );
  });

  it("uses the terminal foreground when the theme color is unknown", () => {
    assert.deepEqual(
      resolveCircuitColor(undefined, { foreground: "#100f0d" }),
      {
        value: "#100f0d",
        source: "terminal foreground",
      }
    );
  });

  it("keeps the theme color when the terminal foreground is unknown", () => {
    assert.deepEqual(
      resolveCircuitColor("#eeeeee", { background: "#ffffff" }),
      { value: "#eeeeee", source: "Pi theme" }
    );
  });

  it("draws labels and lines in the requested ink", () => {
    const drawn = new CircuitSvg(hadamard, {
      theme: "dark",
      inkColor: "#100F0D",
    }).render();

    assert.match(drawn, /color:#100f0d/u);
    assert.match(drawn, /class="label"/u);
    assert.match(drawn, /class="wire"/u);
    assert.match(drawn, /fill="#fff"/u);
  });

  it("fills gate boxes so a light ink stays readable", () => {
    const drawn = new CircuitSvg(hadamard, {
      theme: "light",
      inkColor: "#fffcf0",
    }).render();

    assert.match(drawn, /color:#fffcf0/u);
    assert.match(drawn, /fill="#000"/u);
  });
});

describe("terminal color query", () => {
  it("skips multiplexers", () => {
    assert.equal(skipsTerminalColorQuery({ TMUX: "1" }), true);
    assert.equal(skipsTerminalColorQuery({ TERM: "screen" }), true);
    assert.equal(skipsTerminalColorQuery({ TERM: "dumb" }), false);
  });

  it("reads OSC 10 and OSC 11 colors", async () => {
    const colors = await Promise.all([
      queryTerminalForeground(fakeTerminal({ 10: "100f/0f0f/0d0d" })),
      queryTerminalBackground(fakeTerminal({ 11: "fffc/fcfc/f0f0" })),
    ]);

    assert.deepEqual(colors, ["#100f0d", "#fffcf0"]);
  });

  it("keeps typing that arrives around a split color reply", async () => {
    let listener:
      | ((data: string) => { data?: string; consume?: boolean } | undefined)
      | undefined;
    let trailing: string | undefined;
    const reply = "\x1b]10;rgb:10/0f/0d\x1b\\";
    const tui: TerminalUi = {
      addInputListener(next) {
        listener = next;
        return () => {
          listener = undefined;
        };
      },
      terminal: {
        write() {
          listener?.(reply.slice(0, 4));
          queueMicrotask(() => {
            trailing = listener?.(`${reply.slice(4)}typed`)?.data;
          });
        },
      },
    };

    assert.equal(await queryTerminalForeground(tui), "#100f0d");
    assert.equal(trailing, "typed");
  });
});

function fakeTerminal(replies: { 10?: string; 11?: string }): TerminalUi {
  let listener:
    | ((data: string) => { data?: string; consume?: boolean } | undefined)
    | undefined;
  return {
    addInputListener(next) {
      listener = next;
      return () => {
        listener = undefined;
      };
    },
    terminal: {
      write(data: string) {
        const osc = data.match(/\x1b\](10|11);\?/u)?.[1] as
          "10" | "11" | undefined;
        const body = osc ? replies[osc] : undefined;
        listener?.(`\x1b]${osc};rgb:${body ?? ""}\x1b\\`);
      },
    },
  };
}
