# Feature: qni variable list

qni-cli のユーザとして
保存済みの角度変数を確認するために
qni variable list で変数を一覧表示したい

## Scenario: qni variable list は成功する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- And "qni variable set phi π/2" を実行
- When "qni variable list" を実行
- Then コマンドは成功

## Scenario: qni variable list は変数を一覧表示する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/4" を実行
- And "qni variable set phi π/2" を実行
- When "qni variable list" を実行
- Then 標準出力:

  ```text
  phi=π/2
  theta=π/4
  ```
