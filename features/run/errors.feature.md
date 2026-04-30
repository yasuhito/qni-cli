# Feature: qni run errors

qni-cli のユーザとして
誤った変数や option をすぐ直せるように
qni run が明確な失敗とエラーを返すことを確認したい。


## Scenario: qni run は未束縛の変数 angle があると失敗

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then コマンドは失敗

## Scenario: qni run は未束縛の変数 angle があると失敗 の標準エラーを表示

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準エラー:

  ```text
  unresolved angle variable: theta
  ```

## Scenario: qni run は未束縛の初期状態変数では失敗する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni run" を実行
- Then コマンドは失敗

## Scenario: qni run は未束縛の初期状態変数では失敗する の標準エラーを表示

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni run" を実行
- Then 標準エラー:

  ```text
  unresolved initial state variable: alpha
  ```

## Scenario: qni run は非正規化の初期状態ベクトルでは失敗する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- And "qni variable set alpha 1" を実行
- And "qni variable set beta 1" を実行
- When "qni run" を実行
- Then コマンドは失敗

## Scenario: qni run は非正規化の初期状態ベクトルでは失敗する の標準エラーを表示

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- And "qni variable set alpha 1" を実行
- And "qni variable set beta 1" を実行
- When "qni run" を実行
- Then 標準エラー:

  ```text
  initial state must be normalized
  ```

## Scenario: qni run --symbolic --basis x は 2 qubit 回路では失敗

- Given 空の 2 qubit 回路がある
- When "qni run --symbolic --basis x" を実行
- Then コマンドは失敗

## Scenario: qni run --symbolic --basis x は 2 qubit 回路では失敗 の標準エラーを表示

- Given 空の 2 qubit 回路がある
- When "qni run --symbolic --basis x" を実行
- Then 標準エラー:

  ```text
  symbolic x-basis run currently supports only 1-qubit circuits
  ```

## Scenario: qni run --symbolic --basis y は 2 qubit 回路では失敗

- Given 空の 2 qubit 回路がある
- When "qni run --symbolic --basis y" を実行
- Then コマンドは失敗

## Scenario: qni run --symbolic --basis y は 2 qubit 回路では失敗 の標準エラーを表示

- Given 空の 2 qubit 回路がある
- When "qni run --symbolic --basis y" を実行
- Then 標準エラー:

  ```text
  symbolic y-basis run currently supports only 1-qubit circuits
  ```

## Scenario: qni run --symbolic --basis bell は 1 qubit 回路では失敗

- Given 空の 1 qubit 回路がある
- When "qni run --symbolic --basis bell" を実行
- Then コマンドは失敗

## Scenario: qni run --symbolic --basis bell は 1 qubit 回路では失敗 の標準エラーを表示

- Given 空の 1 qubit 回路がある
- When "qni run --symbolic --basis bell" を実行
- Then 標準エラー:

  ```text
  symbolic bell-basis run currently supports only 2-qubit circuits
  ```

## Scenario: qni run --basis x は --symbolic なしでは失敗

- Given 空の 1 qubit 回路がある
- When "qni run --basis x" を実行
- Then コマンドは失敗

## Scenario: qni run --basis x は --symbolic なしでは失敗 の標準エラーを表示

- Given 空の 1 qubit 回路がある
- When "qni run --basis x" を実行
- Then 標準エラー:

  ```text
  --basis requires --symbolic
  ```
