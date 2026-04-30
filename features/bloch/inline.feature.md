# Feature: qni bloch inline

qni-cli のユーザとして
対応 terminal で画像ファイルを開かずにブロッホ球を確認できるように
qni bloch --inline で Kitty graphics protocol 表示を使いたい。

## Scenario: qni bloch --inline は 1 qubit 回路で成功する

- Given "qni add H --qubit 0 --step 0" を実行
- Given 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
- When "qni bloch --inline" を TTY で実行
- Then コマンドは成功

## Scenario: qni bloch --inline は 1 qubit 回路のブロッホ球を Kitty graphics protocol で表示する

- Given "qni add H --qubit 0 --step 0" を実行
- Given 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
- When "qni bloch --inline" を TTY で実行
- Then 標準出力は Kitty graphics escape sequence を含む

## Scenario: qni bloch --inline --animate は回転ゲートで成功する

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- Given 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
- When "qni bloch --inline --animate" を TTY で実行
- Then コマンドは成功

## Scenario: qni bloch --inline --animate は回転ゲートのブロッホ球を inline animation で表示する

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- Given 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
- When "qni bloch --inline --animate" を TTY で実行
- Then 標準出力は 2 個以上の Kitty graphics escape sequence を含む
