# Feature: gate コマンドの位置読み取り

qni-cli のユーザとして、回路内の保存済みゲートを安全に確認するために、
`qni gate` で保存済みゲートと存在しない位置の扱いを確認したい。

## Scenario: qni gate は保存済みゲートの読み取りに成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: qni gate は保存済みゲートを表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  H
  ```

## Scenario: qni gate は符号付きインデックスで保存済みゲートの読み取りに成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit +0 --step +0" を実行
- Then コマンドは成功

## Scenario: qni gate は符号付きインデックスで保存済みゲートを表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit +0 --step +0" を実行
- Then 標準出力:

  ```text
  H
  ```

## Scenario: qni gate は存在しない位置で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then コマンドは失敗

## Scenario: qni gate は存在しない位置のエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then 標準エラー:

  ```text
  slot does not exist: cols[1][0]
  ```

## Scenario: QNI_USE_RUBY=1 の qni gate は保存済みゲートを表示する

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  H
  ```
