# Feature: qni view の TTY 装飾表示

qni-cli のユーザとして、端末上で読みやすく回路を確認するために、
qni view の TTY 出力で gate ラベルの修飾子を控えめに表示してほしい。

## Scenario: qni view は TTY で T† ゲートを表示できる

- Given "qni add T† --qubit 0 --step 0" を実行
- When "qni view" を TTY で実行
- Then コマンドは成功

## Scenario: qni view は TTY では T† の修飾子を dim 表示する

- Given "qni add T† --qubit 0 --step 0" を実行
- When "qni view" を TTY で実行
- Then 標準出力に dim 修飾付きラベル "T†" を含む

## Scenario: qni view は TTY で Ry ゲートを表示できる

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を TTY で実行
- Then コマンドは成功

## Scenario: qni view は TTY では Ry の修飾子を dim 表示する

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を TTY で実行
- Then 標準出力に dim 修飾付きラベル "Ry" を含む

