# Feature: qni run help

qni-cli のユーザとして
状態ベクトル表示の option を迷わず選べるように
qni run の help で利用できる option を確認したい。

## Scenario: qni run --help は成功する

- When "qni run --help" を実行
- Then コマンドは成功

## Scenario: qni run --help は run コマンドの使い方を表示

- When "qni run --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni run [--symbolic] [--basis=BASIS]

  Overview:
    Simulate ./circuit.json and print the resulting state vector.
    Without --symbolic, output is numeric amplitudes in the computational basis.
    --symbolic prints a symbolic ket expression for supported small circuits.
    --basis currently works only with --symbolic and supports x or y for 1-qubit output, and bell for 2-qubit output.

  Options:
    [--symbolic]       # Show a 1-qubit symbolic state expression
    [--basis=BASIS]    # Show a symbolic state in a named basis such as x, y, or bell

  Examples:
    qni run
    qni run --symbolic
    qni run --symbolic --basis x
    qni run --symbolic --basis y
    qni run --symbolic --basis bell
  ```
