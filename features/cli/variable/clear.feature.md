# Feature: qni variable clear

qni-cli のユーザとして
保存済みの角度変数を初期化するために
qni variable clear ですべての変数を削除したい

## Scenario: qni variable clear は成功する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- And "qni variable set phi π/2" を実行
- When "qni variable clear" を実行
- Then コマンドは成功

## Scenario: qni variable clear はすべての変数を削除する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- And "qni variable set phi π/2" を実行
- When "qni variable clear" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ]
  }
  ```
