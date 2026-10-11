# Feature: 中立回路 JSON の回転ゲートと多重制御ゲート

モデル筆記試験の解答者として
Quantum Katas の回転と制御付き操作を中立語彙で提出し
既存の評価ランナーで状態ベクトルを採点したい。

## Background:

- Given 作業ディレクトリに "prompt.md" を作る:

  ```md
  中立回路 JSON を提出してください。
  ```

- Given 作業ディレクトリに "response.md" を作る:

  ```md
  提出しました。
  ```

## Scenario Outline: <gate> の提出を受理して振幅を正しく採点する

- Given 作業ディレクトリに "benchmark/gate.md" を作る:

  ```md
  ---
  id: smoke/neutral-gate
  title: Neutral Gate
  source: qni-cli cucumber
  difficulty: smoke
  available_gates:
    - <signature>
  allowed_commands:
    - qni add
  grading_cases:
    - id: input
      setup_commands:
        - qni state set "1|<input>>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|<input>>"
                amplitude: { real: <real0>, imaginary: <imag0> }
              - basis: "|<output>>"
                amplitude: { real: <real1>, imaginary: <imag1> }
  ---

  指定の操作を適用してください。
  ```

- Given 作業ディレクトリに "circuit-json/gate.json" を作る:

  ```json
  {"operations":[{"gate":"<gate>","targets":[<target>]<arguments>}]}
  ```

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug gate-vocabulary" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "passed"

### Examples:

    | gate | signature                   | input  | output | target | arguments                      | real0              | imag0               | real1              | imag1               |
    | ---- | --------------------------- | ------ | ------ | ------ | ------------------------------ | ------------------ | ------------------- | ------------------ | ------------------- |
    | Rx   | Rx(angle, target)           | 11110  | 11111  | 4      | ,"angle":"pi/2"                | 0.7071067811865476 | 0                   | 0                  | -0.7071067811865476 |
    | Ry   | Ry(angle, target)           | 11110  | 11111  | 4      | ,"angle":"pi/2"                | 0.7071067811865476 | 0                   | 0.7071067811865476 | 0                   |
    | Rz   | Rz(angle, target)           | 11110  | 11111  | 4      | ,"angle":"pi/2"                | 0.7071067811865476 | -0.7071067811865476 | 0                  | 0                   |
    | CH   | CH(control, target)         | 11110  | 11111  | 4      | ,"controls":[0]                | 0.7071067811865476 | 0                   | 0.7071067811865476 | 0                   |
    | CRx  | CRx(angle, control, target) | 11110  | 11111  | 4      | ,"controls":[0],"angle":"pi/2" | 0.7071067811865476 | 0                   | 0                  | -0.7071067811865476 |
    | CRy  | CRy(angle, control, target) | 11110  | 11111  | 4      | ,"controls":[0],"angle":"pi/2" | 0.7071067811865476 | 0                   | 0.7071067811865476 | 0                   |
    | CRz  | CRz(angle, control, target) | 11110  | 11111  | 4      | ,"controls":[0],"angle":"pi/2" | 0.7071067811865476 | -0.7071067811865476 | 0                  | 0                   |
    | MCX  | MCX(controls, target)       | 11110  | 11111  | 4      | ,"controls":[0,1,2]            | 0                  | 0                   | 1                  | 0                   |
    | MCX  | MCX(controls, target)       | 11110  | 11111  | 4      | ,"controls":[0,1,2,3]          | 0                  | 0                   | 1                  | 0                   |
    | MCX  | MCX(controls, target)       | 111110 | 111111 | 5      | ,"controls":[0,1,2,3,4]        | 0                  | 0                   | 1                  | 0                   |
    | MCX  | MCX(controls, target)       | 11110  | 11111  | 4      | ,"controls":[0]                | 0                  | 0                   | 1                  | 0                   |
    | MCX  | MCX(controls, target)       | 11110  | 11111  | 4      | ,"controls":[0,1]              | 0                  | 0                   | 1                  | 0                   |
    | CH   | CH(control, target)         | 01110  | 01111  | 4      | ,"controls":[0]                | 1                  | 0                   | 0                  | 0                   |
    | CRx  | CRx(angle, control, target) | 01110  | 01111  | 4      | ,"controls":[0],"angle":"pi/2" | 1                  | 0                   | 0                  | 0                   |
    | CRy  | CRy(angle, control, target) | 01110  | 01111  | 4      | ,"controls":[0],"angle":"pi/2" | 1                  | 0                   | 0                  | 0                   |
    | CRz  | CRz(angle, control, target) | 01110  | 01111  | 4      | ,"controls":[0],"angle":"pi/2" | 1                  | 0                   | 0                  | 0                   |
    | MCX  | MCX(controls, target)       | 01110  | 01111  | 4      | ,"controls":[0,1,2,3]          | 1                  | 0                   | 0                  | 0                   |

## Scenario Outline: 不正な提出 <reason> は disallowed のまま記録する

- Given 作業ディレクトリに "benchmark/gate.md" を作る:

  ```md
  ---
  id: smoke/neutral-gate
  title: Neutral Gate
  source: qni-cli cucumber
  difficulty: smoke
  available_gates:
    - <signature>
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: run
        expected:
          - basis: "|0>"
            amplitude: { real: 1, imaginary: 0 }
  ---

  指定の操作を適用してください。
  ```

- Given 作業ディレクトリに "circuit-json/gate.json" を作る:

  ```json
  {"operations":[<operation>]}
  ```

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug invalid-gate-vocabulary" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "disallowed"

### Examples:

    | reason                  | signature                           | operation                                                   |
    | ----------------------- | ----------------------------------- | ----------------------------------------------------------- |
    | 未知のゲート            | Rx(angle, target)                   | {"gate":"RX","targets":[0],"angle":"pi/2"}                  |
    | 許可されない回転        | H(target)                           | {"gate":"Rx","targets":[0],"angle":"pi/2"}                  |
    | 許可されない多重制御    | Toffoli(control1, control2, target) | {"gate":"MCX","controls":[0,1,2],"targets":[3]}             |
    | 制御なしの MCX          | MCX(controls, target)               | {"gate":"MCX","targets":[0]}                                |
    | 制御不足の CRx          | CRx(angle, control, target)         | {"gate":"CRx","targets":[0],"angle":"pi/2"}                 |
    | 制御過多の CH           | CH(control, target)                 | {"gate":"CH","controls":[0,1],"targets":[2]}                |
    | 対象過多の Ry           | Ry(angle, target)                   | {"gate":"Ry","targets":[0,1],"angle":"pi/2"}                |
    | 数値角度                | Rx(angle, target)                   | {"gate":"Rx","targets":[0],"angle":1.5}                     |
    | 数値文字列角度          | Ry(angle, target)                   | {"gate":"Ry","targets":[0],"angle":"1.5"}                   |
    | 数値の積の角度          | Ry(angle, target)                   | {"gate":"Ry","targets":[0],"angle":"2*1.5"}                 |
    | 既存 Phase の非有限角度 | Phase(angle, target)                | {"gate":"Phase","targets":[0],"angle":"pi/0"}               |
    | 未束縛角度              | Rz(angle, target)                   | {"gate":"Rz","targets":[0],"angle":"theta"}                 |
    | 不正な角度              | CRy(angle, control, target)         | {"gate":"CRy","controls":[0],"targets":[1],"angle":"pi//2"} |
    | 非有限角度              | Rz(angle, target)                   | {"gate":"Rz","targets":[0],"angle":"pi/0"}                  |
    | 角度欠落                | CRz(angle, control, target)         | {"gate":"CRz","controls":[0],"targets":[1]}                 |
    | 角度不要の MCX          | MCX(controls, target)               | {"gate":"MCX","controls":[0],"targets":[1],"angle":"pi"}    |
    | 既存 X の制御過多       | X(target)                           | {"gate":"X","controls":[0,1,2],"targets":[3]}               |
    | 既存 CNOT の制御過多    | CNOT(control, target)               | {"gate":"CNOT","controls":[0,1],"targets":[2]}              |
