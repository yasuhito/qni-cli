# Feature: qni variable unset

qni-cli のユーザとして
不要になった角度変数を取り除くために
qni variable unset で指定した変数を削除したい

## Scenario: qni variable unset は成功する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- When "qni variable unset theta" を実行
- Then コマンドは成功

## Scenario: qni variable unset は指定した変数を削除する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- When "qni variable unset theta" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ]
  }
  ```
