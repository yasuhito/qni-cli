# Feature: gate コマンドの slot 読み取り

qni-cli のユーザとして、既存の circuit slot を安全に確認するために、
`qni gate` で保存済み gate と存在しない slot の扱いを確認したい。

## Scenario: qni gate は保存済み gate の読み取りに成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: qni gate は保存済み gate を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  H
  ```

## Scenario: qni gate は符号付き index で保存済み gate の読み取りに成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit +0 --step +0" を実行
- Then コマンドは成功

## Scenario: qni gate は符号付き index で保存済み gate を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit +0 --step +0" を実行
- Then 標準出力:

  ```text
  H
  ```

## Scenario: qni gate は存在しない slot で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then コマンドは失敗

## Scenario: qni gate は存在しない slot のエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then 標準エラー:

  ```text
  slot does not exist: cols[1][0]
  ```

## Scenario: QNI_USE_RUBY=1 の qni gate は保存済み gate を表示する

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  H
  ```
