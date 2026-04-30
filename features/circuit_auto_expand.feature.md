# Feature: circuit auto-expand

qni-cli のユーザとして
必要なサイズの回路を手作業で準備しなくて済むように
ゲート追加時に回路が自動的に拡張されてほしい。

## Scenario: 既存回路に新しい qubit を追加できる

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
