# Feature: qni view のエラーの表示

qni-cli の利用者として、回路を表示できない理由を理解するために、
qni view が入力不足を分かりやすいエラーメッセージで知らせてほしい。

## Scenario: 回路の JSON ファイルがないとき qni view はエラーメッセージを出して失敗

- When "qni view" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  circuit.json does not exist
  ```
