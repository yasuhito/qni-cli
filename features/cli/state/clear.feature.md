# Feature: qni state clear

qni-cli のユーザとして
明示的な初期状態設定を削除するために
qni state clear を使いたい

## Scenario: qni state clear は成功する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni state clear" を実行
- Then コマンドは成功

## Scenario: qni state clear は initial_state を circuit.json から削除する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni state clear" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "cols": [
      [
        1
      ]
    ]
  }
  ```

## Scenario: QNI_USE_RUBY=1 の qni state clear は initial_state を circuit.json から削除する

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni state clear" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 1,
    "cols": [
      [
        1
      ]
    ]
  }
  ```
