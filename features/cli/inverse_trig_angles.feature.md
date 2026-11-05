# Feature: 実数の逆三角関数を含む角度式

qni-cli の利用者として
回路の角度を小数へ手作業で置き換えず
実数主値の逆三角関数をラジアンで計算したい。

## Scenario: asin を使った角度を実際の CLI で追加できる

- When "qni add Ry --angle '2*asin(1)' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 逆三角関数の戻り値は度数でなくラジアンである

- Given "qni add Ry --angle '2*asin(1)' --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0
  ```

## Scenario: 保存済み回答で拒否された atan と sqrt の入れ子を追加できる

- When "qni add Ry --angle '2*atan(1/sqrt(5))' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: acos の負の境界値から状態を反転できる

- Given "qni add Ry --angle 'acos(-1)' --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0
  ```

## Scenario: 括弧と積の優先順位を回路の実行時も保つ

- Given "qni add Ry --angle '2*(atan(1)+atan(1))' --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0
  ```

## Scenario: asin の定義域外を具体的な理由で拒否する

- When "qni add Ry --angle 'asin(2)' --qubit 0 --step 0" を実行
- Then 標準エラーに次を含む:

  ```text
  asin domain error
  ```

## Scenario: 定義域外の角度では回路ファイルを作らない

- When "qni add Ry --angle 'sqrt(-1)' --qubit 0 --step 0" を実行
- Then "circuit.json" は存在しない

## Scenario: 関数の引数での0除算も拒否する

- When "qni add Ry --angle 'atan(1/0)' --qubit 0 --step 0" を実行
- Then 標準エラーに次を含む:

  ```text
  division by zero
  ```

## Scenario: JavaScript の属性参照や呼び出しを実行しない

- When "qni add Ry --angle 'process.exit(0)' --qubit 0 --step 0" を実行
- Then 終了コードは 1

## Scenario: 未対応の厳密な記号表示を数値対応と混同しない

- Given "qni add Ry --angle '2*atan(1/sqrt(5))' --qubit 0 --step 0" を実行
- When "qni run --symbolic --latex" を実行
- Then 標準エラーに次を含む:

  ```text
  unsupported angle for symbolic run
  ```

## Scenario: 通常の LaTeX 表示は新しい式でも数値表示へ戻れる

- Given "qni add Ry --angle '2*atan(1/sqrt(5))' --qubit 0 --step 0" を実行
- When "qni run --latex" を実行
- Then コマンドは成功

## Scenario: 手書き回路の定義域違反も記号表示の未対応と区別する

- Given 作業ディレクトリに "circuit.json" を作る:

  ```json
  { "qubits": 1, "cols": [["Ry(asin(2))"]] }
  ```

- When "qni run --symbolic" を実行
- Then 標準エラーに次を含む:

  ```text
  asin domain error
  ```

## Scenario: pi を含まない具体的な逆三角関数式を中立 JSON から採点できる

- Given 作業ディレクトリに "benchmark/flip.md" を作る:

  ```md
  ---
  id: inverse/flip
  title: Inverse flip
  available_gates:
    - Ry(angle, target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: run
        expected:
          - basis: "|1>"
            amplitude: { real: 1, imaginary: 0 }
  ---

  ゼロ状態を1へ変えてください。
  ```

- Given 作業ディレクトリに "answers/flip.json" を作る:

  ```json
  { "operations": [{ "gate": "Ry", "targets": [0], "angle": "2*asin(1)" }] }
  ```

- Given 作業ディレクトリに "prompt.md" を作る:

  ```md
  回転回路を作ってください。
  ```

- Given 作業ディレクトリに "response.md" を作る:

  ```md
  保存済みの解答を記録する。
  ```

- When "qni research record --collaborator offline --benchmark benchmark --circuit-json-dir answers --prompt prompt.md --response response.md --slug inverse-angle" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "passed"
