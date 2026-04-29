# Feature: H ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に H ゲートを追加したい。

## Scenario: H ゲート追加で circuit.json を作成

- When "qni add H --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```

- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ H ├
      └───┘
  ```
