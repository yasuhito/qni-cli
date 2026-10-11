import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  convertNeutralCircuitJsonToQniSubmission,
  NeutralCircuitJsonSubmissionError,
} from "../../src/evaluation_runner/neutral_circuit_json_submission";

const ALL_AVAILABLE_GATES = [
  "X(target)",
  "Y(target)",
  "Z(target)",
  "H(target)",
  "S(target)",
  "T(target)",
  "Phase(angle, target)",
  "GlobalPhase(angle, target)",
  "CNOT(control, target)",
  "CZ(control, target)",
  "ControlledPhase(angle, control, target)",
  "ControlledGlobalPhase(angle, control, target)",
  "Toffoli(control1, control2, target)",
  "SWAP(target1, target2)",
  "CSWAP(control, target1, target2)",
  "Rx(angle, target)",
  "Ry(angle, target)",
  "Rz(angle, target)",
  "CH(control, target)",
  "CRx(angle, control, target)",
  "CRy(angle, control, target)",
  "CRz(angle, control, target)",
  "MCX(controls, target)",
];

describe("neutral circuit JSON submission converter", () => {
  it("converts valid operations JSON to qni commands in operation order", () => {
    const submissionText = JSON.stringify({
      operations: [
        { gate: "X", targets: [0] },
        { gate: "Y", targets: [1] },
        { gate: "Z", targets: [2] },
        { gate: "H", targets: [0] },
        { gate: "S", targets: [1] },
        { gate: "T", targets: [2] },
        { gate: "Phase", angle: "pi/3", targets: [0] },
        { gate: "GlobalPhase", angle: "-pi/2", targets: [1] },
        { gate: "CNOT", controls: [0], targets: [1] },
        { gate: "CZ", controls: [1], targets: [0] },
        { gate: "ControlledPhase", angle: "pi/4", controls: [0], targets: [2] },
        {
          gate: "ControlledGlobalPhase",
          angle: "2*pi",
          controls: [0],
          targets: [1],
        },
        { gate: "Toffoli", controls: [0, 1], targets: [2] },
        { gate: "SWAP", targets: [0, 2] },
        { gate: "CSWAP", controls: [0], targets: [1, 2] },
      ],
    });

    const qni = convertNeutralCircuitJsonToQniSubmission({
      availableGates: ALL_AVAILABLE_GATES,
      submissionText,
    });

    assert.equal(
      qni,
      [
        "qni add X --qubit 0 --step 0",
        "qni add Y --qubit 1 --step 1",
        "qni add Z --qubit 2 --step 2",
        "qni add H --qubit 0 --step 3",
        "qni add S --qubit 1 --step 4",
        "qni add T --qubit 2 --step 5",
        "qni add P --angle π/3 --qubit 0 --step 6",
        "qni add GlobalPhase --angle -π/2 --qubit 1 --step 7",
        "qni add X --control 0 --qubit 1 --step 8",
        "qni add Z --control 1 --qubit 0 --step 9",
        "qni add P --angle π/4 --control 0 --qubit 2 --step 10",
        "qni add GlobalPhase --angle 2π --control 0 --qubit 1 --step 11",
        "qni add X --control 0,1 --qubit 2 --step 12",
        "qni add SWAP --qubit 0,2 --step 13",
        "qni add SWAP --control 0 --qubit 1,2 --step 14",
        "",
      ].join("\n")
    );
  });

  for (const gate of ["Rx", "Ry", "Rz", "CRx", "CRy", "CRz"]) {
    const controlled = gate.startsWith("C");
    const controls = controlled ? [2] : [];
    const operation = { gate, controls, targets: [0], angle: "- pi / 3" };

    it(`converts ${gate} with a normalized symbolic angle`, () => {
      assert.equal(
        convertNeutralCircuitJsonToQniSubmission({
          availableGates: ALL_AVAILABLE_GATES,
          submissionText: JSON.stringify({ operations: [operation] }),
        }),
        `qni add ${controlled ? gate.slice(1) : gate} --angle -π/3${controlled ? " --control 2" : ""} --qubit 0 --step 0\n`
      );
    });

    it(`rejects invalid angles for ${gate}`, () => {
      for (const [angle, pattern] of [
        [null, /must be a string/u],
        [1.5, /must be a string/u],
        ["1.5", /not numeric radians/u],
        ["theta", /must use a symbolic pi expression/u],
        ["2*1.5", /must use a symbolic pi expression/u],
        ["pi//2", /invalid angle/u],
        ["pi/0", /must be finite/u],
        [`${"9".repeat(400)}pi`, /must be finite/u],
      ] as const) {
        assertInvalidSubmission(
          JSON.stringify({ operations: [{ ...operation, angle }] }),
          pattern,
          gate
        );
      }
      assertInvalidSubmission(
        JSON.stringify({ operations: [{ gate, controls, targets: [0] }] }),
        /expects an angle/u,
        gate
      );
    });

    it(`keeps argument counts and task permissions strict for ${gate}`, () => {
      for (const targets of [[], [0, 1]]) {
        assertInvalidSubmission(
          JSON.stringify({ operations: [{ ...operation, targets }] }),
          /expects .*target/u,
          gate
        );
      }
      for (const invalidControls of controlled ? [[], [1, 2]] : [[1], [1, 2]]) {
        assertInvalidSubmission(
          JSON.stringify({
            operations: [{ ...operation, controls: invalidControls }],
          }),
          /expects .*control/u,
          gate
        );
      }
      assertInvalidSubmission(
        JSON.stringify({ operations: [operation] }),
        /not available/u,
        gate,
        ["H(target)"]
      );
    });
  }

  it("accepts decimal pi coefficients and zero rotations", () => {
    for (const [angle, normalized] of [
      ["0.608*pi", "0.608π"],
      ["0*pi", "0π"],
      ["2*pi/3", "2π/3"],
    ]) {
      assert.equal(
        convertNeutralCircuitJsonToQniSubmission({
          availableGates: ["Ry(angle, target)"],
          submissionText: JSON.stringify({
            operations: [{ gate: "Ry", angle, targets: [0] }],
          }),
        }),
        `qni add Ry --angle ${normalized} --qubit 0 --step 0\n`
      );
    }
  });

  it("rejects non-finite and numeric-product angles for existing phase gates too", () => {
    for (const gate of [
      "Phase",
      "GlobalPhase",
      "ControlledPhase",
      "ControlledGlobalPhase",
    ]) {
      const controls = gate.startsWith("Controlled") ? [1] : [];
      for (const [angle, pattern] of [
        ["pi/0", /must be finite/u],
        ["2*1.5", /must use a symbolic pi expression/u],
      ] as const) {
        assertInvalidSubmission(
          JSON.stringify({
            operations: [{ gate, controls, targets: [0], angle }],
          }),
          pattern,
          gate
        );
      }
    }
  });

  it("converts controlled H without an angle", () => {
    assert.equal(
      convertNeutralCircuitJsonToQniSubmission({
        availableGates: ["CH(control, target)"],
        submissionText: JSON.stringify({
          operations: [{ gate: "CH", controls: [2], targets: [0] }],
        }),
      }),
      "qni add H --control 2 --qubit 0 --step 0\n"
    );
  });

  it("converts MCX with any positive number of controls in their supplied order", () => {
    for (const controls of [
      [2],
      [2, 0],
      [2, 0, 1],
      [3, 0, 2, 1],
      Array.from({ length: 20 }, (_, index) => index),
    ]) {
      assert.equal(
        convertNeutralCircuitJsonToQniSubmission({
          availableGates: ["MCX(controls, target)"],
          submissionText: JSON.stringify({
            operations: [{ gate: "MCX", controls, targets: [20] }],
          }),
        }),
        `qni add X --control ${controls.join(",")} --qubit 20 --step 0\n`
      );
    }
  });

  it("rejects invalid CH and MCX arguments", () => {
    for (const gate of ["CH", "MCX"]) {
      assertInvalidSubmission(
        JSON.stringify({ operations: [{ gate, targets: [0] }] }),
        /expects .*1 control/u,
        gate
      );
      for (const targets of [[], [1, 2]]) {
        assertInvalidSubmission(
          JSON.stringify({ operations: [{ gate, controls: [0], targets }] }),
          /expects .*1 target/u,
          gate
        );
      }
      assertInvalidSubmission(
        JSON.stringify({
          operations: [{ gate, controls: [0], targets: [1], angle: "pi" }],
        }),
        /does not accept angle/u,
        gate
      );
      assertInvalidSubmission(
        JSON.stringify({
          operations: [{ gate, controls: [-1], targets: [0] }],
        }),
        /must be a non-negative integer/u,
        gate
      );
      assertInvalidSubmission(
        JSON.stringify({
          operations: [{ gate, controls: [0.5], targets: [1] }],
        }),
        /must be a non-negative integer/u,
        gate
      );
    }
    assertInvalidSubmission(
      JSON.stringify({
        operations: [{ gate: "CH", controls: [0, 1], targets: [2] }],
      }),
      /expects 1 control/u,
      "CH"
    );
  });

  it("does not broaden fixed-control vocabulary permissions through MCX", () => {
    for (const availableGate of [
      "X(target)",
      "CNOT(control, target)",
      "Toffoli(control1, control2, target)",
      "CCNOT(control1, control2, target)",
    ]) {
      assertInvalidSubmission(
        JSON.stringify({
          operations: [{ gate: "MCX", controls: [0, 1, 2], targets: [3] }],
        }),
        /not available/u,
        availableGate,
        [availableGate]
      );
    }
    for (const gate of ["X", "CNOT", "Toffoli", "CCNOT"]) {
      assertInvalidSubmission(
        JSON.stringify({
          operations: [{ gate, controls: [0, 1, 2], targets: [3] }],
        }),
        /expects/u,
        gate
      );
      assertInvalidSubmission(
        JSON.stringify({ operations: [{ gate, targets: [0] }] }),
        /not available/u,
        gate,
        ["MCX(controls, target)"]
      );
    }
    assertInvalidSubmission(
      JSON.stringify({
        operations: [{ gate: "CH", controls: [0], targets: [1] }],
      }),
      /not available/u,
      "CH",
      ["H(target)"]
    );
  });

  it("does not generate prompt text for showing qni-cli to a model", () => {
    const qni = convertNeutralCircuitJsonToQniSubmission({
      availableGates: ["H(target)"],
      submissionText: JSON.stringify({
        operations: [{ gate: "H", targets: [0] }],
      }),
    });

    assert.equal(qni, "qni add H --qubit 0 --step 0\n");
    assert.doesNotMatch(
      qni,
      /qni-cli|ベンチマーク課題|出力ルール|allowed_commands/u
    );
  });

  it("accepts existing task aliases for Phase and Toffoli available gates", () => {
    const qni = convertNeutralCircuitJsonToQniSubmission({
      availableGates: ["P(angle, target)", "CCNOT(control1, control2, target)"],
      submissionText: JSON.stringify({
        operations: [
          { gate: "Phase", angle: "pi/3", targets: [0] },
          { gate: "Toffoli", controls: [0, 1], targets: [2] },
        ],
      }),
    });

    assert.equal(
      qni,
      [
        "qni add P --angle π/3 --qubit 0 --step 0",
        "qni add X --control 0,1 --qubit 2 --step 1",
        "",
      ].join("\n")
    );
  });

  it("rejects invalid submission formats and schema violations", () => {
    const examples: ReadonlyArray<readonly [string, string, RegExp]> = [
      [
        "unknown top-level key",
        JSON.stringify({ operations: [], explanation: "extra" }),
        /unknown top-level key: explanation/u,
      ],
      [
        "Markdown code fence",
        '```json\n{"operations":[]}\n```',
        /must not be wrapped in Markdown code fences/u,
      ],
      [
        "explanatory text",
        '{"operations":[]}\nThis circuit applies H.',
        /must be valid JSON with no explanatory text/u,
      ],
      [
        "missing operations key",
        JSON.stringify({}),
        /top-level operations is required/u,
      ],
      [
        "array root",
        JSON.stringify([]),
        /neutral circuit submission must be a top-level object/u,
      ],
      [
        "string root",
        JSON.stringify("not an object"),
        /neutral circuit submission must be a top-level object/u,
      ],
      [
        "unknown operation key",
        JSON.stringify({
          operations: [{ gate: "H", targets: [0], note: "extra" }],
        }),
        /unknown operation key at operations\[0\]: note/u,
      ],
      [
        "unknown gate",
        JSON.stringify({
          operations: [{ gate: "RX", angle: "pi/2", targets: [0] }],
        }),
        /unknown gate at operations\[0\]: RX/u,
      ],
      [
        "numeric angle",
        JSON.stringify({
          operations: [{ gate: "Phase", angle: Math.PI / 2, targets: [0] }],
        }),
        /angle at operations\[0\] must be a string/u,
      ],
      [
        "numeric angle string",
        JSON.stringify({
          operations: [{ gate: "Phase", angle: "3.14", targets: [0] }],
        }),
        /angle at operations\[0\] must use a symbolic pi expression, not numeric radians/u,
      ],
      [
        "variable angle string",
        JSON.stringify({
          operations: [{ gate: "Phase", angle: "notanangle", targets: [0] }],
        }),
        /angle at operations\[0\] must use a symbolic pi expression/u,
      ],
      [
        "malformed pi angle string",
        JSON.stringify({
          operations: [{ gate: "Phase", angle: "pi//2", targets: [0] }],
        }),
        /invalid angle at operations\[0\]/u,
      ],
      [
        "missing arguments",
        JSON.stringify({
          operations: [{ gate: "CNOT", controls: [0], targets: [] }],
        }),
        /CNOT at operations\[0\] expects 1 control and 1 target/u,
      ],
      [
        "extra arguments",
        JSON.stringify({
          operations: [{ gate: "X", controls: [0], targets: [1] }],
        }),
        /X at operations\[0\] expects no controls and 1 target/u,
      ],
    ];

    for (const [name, submissionText, errorPattern] of examples) {
      assertInvalidSubmission(submissionText, errorPattern, name);
    }
  });

  it("rejects gates that are not listed in task available_gates", () => {
    assertInvalidSubmission(
      JSON.stringify({ operations: [{ gate: "H", targets: [0] }] }),
      /gate at operations\[0\] is not available for this task: H/u,
      "gate unavailable for task",
      ["X(target)"]
    );
  });
});

function assertInvalidSubmission(
  submissionText: string,
  errorPattern: RegExp,
  message: string,
  availableGates: readonly string[] = ALL_AVAILABLE_GATES
): void {
  assert.throws(
    () =>
      convertNeutralCircuitJsonToQniSubmission({
        availableGates,
        submissionText,
      }),
    (error: unknown) => {
      if (!(error instanceof NeutralCircuitJsonSubmissionError)) {
        assert.fail(`${message}: expected converter error`);
      }

      assert.equal(error.name, "NeutralCircuitJsonSubmissionError", message);
      assert.match(error.message, errorPattern, message);
      return true;
    }
  );
}
