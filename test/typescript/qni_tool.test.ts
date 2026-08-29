import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBatchFailure,
  formatCommandHeading,
  truncateQniOutput,
  validateQniToolParams
} from "../../src/qni-math/qni-tool";

test("formats qni command headings with shell-style quoting only when needed", () => {
  assert.equal(
    formatCommandHeading(["state", "set", "alpha|0> + beta|1>", "name@example.com"]),
    "$ qni state set 'alpha|0> + beta|1>' name@example.com"
  );
  assert.equal(formatCommandHeading(["state", "set", "it's ready"]), "$ qni state set 'it'\"'\"'s ready'");
});

test("rejects invalid batch shapes", () => {
  for (const params of [
    {},
    { args: ["--help"], commands: [["--help"]] },
    { commands: [] },
    { commands: [[]] }
  ]) {
    assert.throws(() => validateQniToolParams(params), /args|commands/u);
  }
});

test("truncates each qni stdout with Pi's default line limit", async () => {
  const stdout = `${Array.from({ length: 2001 }, (_, index) => `line-${index + 1}`).join("\n")}\n`;
  const output = await truncateQniOutput(stdout);

  assert.equal(output.truncated, true);
  assert.match(output.text, /\[Output truncated: 2000 of 2001 lines/u);
  assert.doesNotMatch(output.text, /line-2001/u);
});

test("does not claim the workdir is unchanged when the first command fails", () => {
  const message = formatBatchFailure(
    [],
    ["export", "--png", "output/circuit.png"],
    { stdout: "", stderr: "pdflatex not found\n", code: 1, killed: false },
    0,
    3
  );

  assert.match(message, /Stopped at command 1 of 3\. No commands succeeded\./u);
  assert.doesNotMatch(message, /no changes were made/u);
});

test("reports the complete range of commands not run after a failure", () => {
  const message = formatBatchFailure(
    ["$ qni add X"],
    ["does-not-exist"],
    { stdout: "", stderr: "unknown command\n", code: 1, killed: false },
    1,
    5
  );

  assert.match(message, /Commands 3-5 were not run\./u);
});

test("formats a batch failure with completed output and the stop position", () => {
  assert.equal(
    formatBatchFailure(
      ["$ qni add X"],
      ["does-not-exist"],
      { stdout: "", stderr: "unknown command\n", code: 1, killed: false },
      1,
      3
    ),
    [
      "$ qni add X",
      "$ qni does-not-exist",
      "unknown command",
      "qni exited with status 1",
      "Stopped at command 2 of 3. Commands 1 succeeded and their changes remain in the workdir. Command 3 was not run."
    ].join("\n")
  );
});
