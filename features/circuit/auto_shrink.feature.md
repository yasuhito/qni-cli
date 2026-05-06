# Feature: 回路の自動縮小

qni-cli の利用者として
回路をできるだけコンパクトに保つために
空の先頭ステップや量子ビットを自動的に詰めたい。
ゲート削除後の自動縮小シナリオもここで扱う。

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

## Scenario: 空の先頭量子ビットは自動的に削除される

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

## Scenario: 空の末尾量子ビットは自動的に削除される

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

## Scenario: 空の末尾ステップは自動的に削除される

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --qubit 1 --step 1" を実行
- When "qni rm --qubit 1 --step 1" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```
