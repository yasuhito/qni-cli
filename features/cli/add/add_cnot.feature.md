# Feature: CNOT ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定したステップ、制御量子ビット、対象量子ビットに CNOT ゲートを追加したい。

## Scenario: CNOT ゲート追加コマンドは成功

- When "qni add X --control 0 --qubit 1 --step 0" を実行
- Then コマンドは成功

## Scenario: CNOT ゲート追加コマンドの標準出力は空

- When "qni add X --control 0 --qubit 1 --step 0" を実行
- Then 標準出力は空

## Scenario: CNOT ゲートを追加した回路を表示

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

## Scenario: CNOT ゲート追加で circuit.json を作成

- When "qni add X --control 0 --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["•", "X"]
    ]
  }
  ```

## Scenario: CNOT ゲートは小数のステップ値でも circuit.json を作成

- When "qni add X --control 0 --qubit 1 --step 0.0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["•", "X"]
    ]
  }
  ```
