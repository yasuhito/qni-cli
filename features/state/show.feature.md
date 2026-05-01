# Feature: qni state show

qni-cli のユーザとして
現在の初期状態ベクトルを確認するために
qni state show を使いたい

## Scenario: qni state show は成功する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni state show" を実行
- Then コマンドは成功

## Scenario: qni state show は現在の初期状態を表示する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  alpha|0> + beta|1>
  ```
