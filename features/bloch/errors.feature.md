# Feature: qni bloch errors

qni-cli のユーザとして
誤った bloch コマンドの使い方をすぐ直せるように
qni bloch が明確なエラーを返してほしい。

## Scenario: qni bloch は 2 qubit 回路では失敗する

- Given 空の 2 qubit 回路がある
- When "qni bloch --png --output bloch.png" を実行
- Then コマンドは失敗

## Scenario: qni bloch は 2 qubit 回路では対応 qubit 数のエラーを表示する

- Given 空の 2 qubit 回路がある
- When "qni bloch --png --output bloch.png" を実行
- Then 標準エラー:

  ```text
  bloch currently supports only 1-qubit circuits
  ```

## Scenario: qni bloch は未解決の角度変数を含むと失敗する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then コマンドは失敗

## Scenario: qni bloch は未解決の角度変数名をエラー表示する

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then 標準エラー:

  ```text
  unresolved angle variable: theta
  ```

## Scenario: qni bloch は --png と --apng の同時指定で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --apng --output bloch.png" を実行
- Then コマンドは失敗

## Scenario: qni bloch は --png と --apng の同時指定で出力形式の選択エラーを表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --apng --output bloch.png" を実行
- Then 標準エラー:

  ```text
  choose exactly one of --png, --apng, or --inline
  ```

## Scenario: qni bloch は --inline と --output の同時指定で失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --inline --output bloch.png" を実行
- Then コマンドは失敗

## Scenario: qni bloch は --inline と --output の同時指定で output option のエラーを表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --inline --output bloch.png" を実行
- Then 標準エラー:

  ```text
  --output is not supported with --inline
  ```

## Scenario: qni bloch は --animate を --inline なしでは使えない

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni bloch --apng --animate --output bloch.png" を実行
- Then コマンドは失敗

## Scenario: qni bloch は --animate を --inline なしで使うと inline option のエラーを表示する

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni bloch --apng --animate --output bloch.png" を実行
- Then 標準エラー:

  ```text
  --animate is supported only with --inline
  ```

## Scenario: qni bloch --inline は unsupported terminal では失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --inline" を実行
- Then コマンドは失敗

## Scenario: qni bloch --inline は unsupported terminal で terminal 要件のエラーを表示する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --inline" を実行
- Then 標準エラー:

  ```text
  inline bloch rendering requires a Kitty-compatible terminal; use --png or --apng instead
  ```
