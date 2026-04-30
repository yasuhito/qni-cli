# Feature: qni variable errors

qni-cli のユーザとして
variable コマンドの入力エラーを理解するために
qni variable のエラーを確認したい

## Scenario: qni variable set は circuit.json がないと失敗する

- When "qni variable set theta π/4" を実行
- Then コマンドは失敗

## Scenario: qni variable set は circuit.json がないとエラー内容を表示する

- When "qni variable set theta π/4" を実行
- Then 標準エラー:

  ```text
  circuit.json does not exist
  ```
