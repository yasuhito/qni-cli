# Feature: gate コマンドのスロット読み取り

qni-cli の利用者として、回路内のスロットを安全に確認するために、
`qni gate` で保存済みゲートと存在しないスロットの扱いを確認したい。

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

## Scenario: qni gate は存在しないスロットで失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then コマンドは失敗

## Scenario: qni gate は存在しないスロットのエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 1" を実行
- Then 標準エラー:

  ```text
  slot does not exist: cols[1][0]
  ```
