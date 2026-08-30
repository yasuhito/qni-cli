# Feature: 回路の自動拡張

qni-cli の利用者として
必要なサイズの回路を手作業で準備しなくて済むように
ゲートを追加するときに回路が自動的に拡張されてほしい。

## Scenario: 既存回路に新しい量子ビットを追加できる

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni add H --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["H", "H"]
    ]
  }
  ```

## Scenario: 新しい回路では明示した量子ビット番号を維持する

- When "qni add X --qubit 3 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 4,
    "cols": [
      [1, 1, 1, "X"]
    ]
  }
  ```
