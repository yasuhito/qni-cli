# Feature: qni state set

qni-cli のユーザとして
任意の初期状態ベクトルを保存するために
qni state set を使いたい

## Scenario: qni state set は alpha|0> + beta|1> の保存に成功する

- When "qni state set \"alpha|0> + beta|1>\"" を実行
- Then コマンドは成功

## Scenario: qni state set は alpha|0> + beta|1> を circuit.json に保存する

- When "qni state set \"alpha|0> + beta|1>\"" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "initial_state": {
      "format": "ket_sum_v1",
      "terms": [
        {
          "basis": "0",
          "coefficient": "alpha"
        },
        {
          "basis": "1",
          "coefficient": "beta"
        }
      ]
    },
    "cols": [
      [
        1
      ]
    ]
  }
  ```
