# Feature: circuit auto-shrink

qni の回路データとして、空の先頭 step や qubit は自動的に詰めたい。
これは `qni add` 固有の仕様ではなく、回路全体の auto-shrink 仕様である。
将来 gate delete/remove を追加した場合も、削除後の auto-shrink シナリオをここに追加する。

## Scenario: 空の先頭ステップは自動的に削除される

- When "qni add H --qubit 0 --step 1" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```

## Scenario: 空の先頭 qubit は自動的に削除される

- When "qni add H --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```
