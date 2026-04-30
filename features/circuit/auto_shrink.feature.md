# Feature: circuit auto-shrink

qni-cli のユーザとして
回路をできるだけコンパクトに保つために
空の先頭 step や qubit を自動的に詰めたい。
gate remove 後の auto-shrink シナリオもここで扱う。

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

## Scenario: 空の末尾 qubit は自動的に削除される

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --qubit 1 --step 0" を実行
- When "qni rm --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```
