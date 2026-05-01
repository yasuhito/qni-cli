# Feature: qni view のエラー表示

qni-cli のユーザとして、回路を表示できない理由を理解するために、
qni view が入力不足を明確なエラーメッセージで知らせてほしい。

## Scenario: 回路 json がないとき qni view はエラーメッセージを出して失敗

- When "qni view" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  circuit.json does not exist
  ```

