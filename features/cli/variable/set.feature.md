# Feature: qni variable set

qni-cli のユーザとして
角度変数を使って回路を再利用するために
qni variable set で変数を保存したい

## Scenario: qni variable set は成功する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni variable set theta π/4" を実行
- Then コマンドは成功

## Scenario: qni variable set は circuit.json に変数を保存する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni variable set theta π/4" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ],
    "variables": {
      "theta": "π/4"
    }
  }
  ```
