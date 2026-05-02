# Feature: gate コマンドのエラー表示

qni-cli のユーザとして、`qni gate` の入力エラーを理解するために、
gate コマンドの qubit validation エラーを確認したい。

## Scenario: qni gate は qubit が整数でないと失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit nope --step 0" を実行
- Then コマンドは失敗

## Scenario: qni gate は qubit が整数でないとエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit nope --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```

## Scenario: qni gate は小数 qubit で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 1.0 --step 0" を実行
- Then コマンドは失敗

## Scenario: qni gate は小数 qubit のエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 1.0 --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```
