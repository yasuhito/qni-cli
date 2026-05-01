# Feature: qni view の ASCII 回路パーサ

qni-cli のユーザとして、Markdown feature から回路図を入力できるように、
qni view の ASCII 回路パーサで circuit.json を作りたい。

## Scenario: 空回路の ASCII 回路図を読み込める

- When 次の回路図を読み込もうとする:

  ```text
  q0: ─────
  ```

- Then 読み込みは成功

## Scenario: 空回路の ASCII 回路図から circuit.json を作る

- Given 次の回路図がある:

  ```text
  q0: ─────
  ```

- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      [1]
    ]
  }
  ```

## Scenario: X 回路の ASCII 回路図を読み込める

- When 次の回路図を読み込もうとする:

  ```text
      ┌───┐
  q0: ┤ X ├
      └───┘
  ```

- Then 読み込みは成功

## Scenario: X 回路の ASCII 回路図から circuit.json を作る

- Given 次の回路図がある:

  ```text
      ┌───┐
  q0: ┤ X ├
      └───┘
  ```

- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["X"]
    ]
  }
  ```

## Scenario: X 回路を実行すると |1> の状態ベクトルを表示する

- Given 次の回路図がある:

  ```text
      ┌───┐
  q0: ┤ X ├
      └───┘
  ```

- When "qni run" を実行
- Then コマンドは成功

## Scenario: X 回路の実行結果は |1> の状態ベクトルになる

- Given 次の回路図がある:

  ```text
      ┌───┐
  q0: ┤ X ├
      └───┘
  ```

- When "qni run" を実行
- Then 標準出力の内容:

  ```text
  0.0,1.0
  ```

## Scenario: X-X 回路の ASCII 回路図を読み込める

- When 次の回路図を読み込もうとする:

  ```text
      ┌───┐┌───┐
  q0: ┤ X ├┤ X ├
      └───┘└───┘
  ```

- Then 読み込みは成功

## Scenario: X-X 回路の ASCII 回路図から circuit.json を作る

- Given 次の回路図がある:

  ```text
      ┌───┐┌───┐
  q0: ┤ X ├┤ X ├
      └───┘└───┘
  ```

- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["X"],
      ["X"]
    ]
  }
  ```

## Scenario: X-X 回路の実行結果は |0> の状態ベクトルになる

- Given 次の回路図がある:

  ```text
      ┌───┐┌───┐
  q0: ┤ X ├┤ X ├
      └───┘└───┘
  ```

- When "qni run" を実行
- Then コマンドは成功

## Scenario: X-X 回路の実行結果は |0> の状態ベクトルを表示する

- Given 次の回路図がある:

  ```text
      ┌───┐┌───┐
  q0: ┤ X ├┤ X ├
      └───┘└───┘
  ```

- When "qni run" を実行
- Then 標準出力の内容:

  ```text
  1.0,0.0
  ```

## Scenario: controlled X 回路の ASCII 回路図を読み込める

- When 次の回路図を読み込もうとする:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

- Then 読み込みは成功

## Scenario: controlled X 回路の ASCII 回路図から circuit.json を作る

- Given 次の回路図がある:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["•", "X"]
    ]
  }
  ```

## Scenario: controlled X 回路を |10> に適用して実行できる

- Given 2 qubit の初期状態が "|10>" である
- When 次の回路図を適用:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

- When "qni run" を実行
- Then コマンドは成功

## Scenario: controlled X 回路を |10> に適用した実行結果は |11> になる

- Given 2 qubit の初期状態が "|10>" である
- When 次の回路図を適用:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

- When "qni run" を実行
- Then 標準出力の内容:

  ```text
  0.0,0.0,0.0,1.0
  ```

## Scenario: Ry(π/2) 回路の拡張 ASCII 回路図を読み込める

- When 次の回路図を読み込もうとする:

  ```text
       π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

- Then 読み込みは成功

## Scenario: Ry(π/2) 回路の拡張 ASCII 回路図から circuit.json を作る

- Given 次の回路図がある:

  ```text
       π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(π/2)"]
    ]
  }
  ```

## Scenario: Ry(π/2) 回路の実行結果は等しい重ね合わせになる

- Given 次の回路図がある:

  ```text
       π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

- When "qni run --symbolic" を実行
- Then コマンドは成功

## Scenario: Ry(π/2) 回路の実行結果は等しい重ね合わせを表示する

- Given 次の回路図がある:

  ```text
       π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

- When "qni run --symbolic" を実行
- Then 標準出力の内容:

  ```text
  sqrt(2)/2|0> + sqrt(2)/2|1>
  ```
