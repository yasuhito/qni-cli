# Feature: qni export errors

qni-cli のユーザとして
誤った option 組み合わせをすぐ直せるように
qni export が明確なエラーを返してほしい。

## Scenario: qni export --caption-position に不正な値を指定すると失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption test --caption-position middle" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  --caption-position must be top or bottom
  ```

## Scenario: qni export --dark と --light を同時指定すると失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --dark --light" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  choose at most one of --dark or --light
  ```

## Scenario: qni export --circle-notation は --png なしでは失敗する

- Given "qni state set |+>" を実行
- When "qni export --circle-notation --output circles.png" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  --circle-notation currently supports only --png
  ```

## Scenario: qni export --circle-notation と --state-vector を同時指定すると失敗する

- Given "qni state set |+>" を実行
- When "qni export --circle-notation --state-vector --png --output circles.png" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  choose at most one of --state-vector or --circle-notation
  ```

## Scenario: qni export --circle-notation --png は 3 qubit 回路では失敗する

- Given 空の 3 qubit 回路がある
- When "qni export --circle-notation --png --output circles.png" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  circle notation currently supports only 1-qubit and 2-qubit circuits
  ```
