# Feature: qni run initial states

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
