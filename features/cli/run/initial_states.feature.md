# Feature: qni run の初期状態

qni-cli のユーザとして
qni state set で指定した初期状態から数値実行するために
qni run が変数解決済みの初期状態を使うことを確認したい。


## Scenario: qni run は変数解決した初期状態ベクトルから数値実行する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- And "qni variable set alpha 0.6" を実行
- And "qni variable set beta 0.8" を実行
- And "qni add X --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.8,0.6
  ```

## Scenario: qni run は短い initial_state を後続の |0> 量子ビットで拡張して数値実行する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 2,
    "cols": [
      [
        1,
        "X"
      ]
    ],
    "initial_state": {
      "format": "ket_sum_v1",
      "terms": [
        {
          "basis": "0",
          "coefficient": "0.7071067811865476"
        },
        {
          "basis": "1",
          "coefficient": "0.7071067811865476"
        }
      ]
    }
  }
  ```
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.7071067811865476,0.0,0.7071067811865476
  ```
