# Feature: gate コマンドのエラー表示

qni-cli のユーザーとして、`qni gate` の入力エラーを理解するために、
`gate` コマンドの量子ビット検証エラーを確認したい。

## Scenario: qni gate は量子ビット番号が整数でないと失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit nope --step 0" を実行
- Then コマンドは失敗

## Scenario: qni gate は量子ビット番号が整数でないとエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit nope --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```

## Scenario: qni gate は小数の量子ビット番号で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 1.0 --step 0" を実行
- Then コマンドは失敗

## Scenario: qni gate は小数の量子ビット番号のエラー内容を表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 1.0 --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```
