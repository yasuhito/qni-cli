# Feature: expect コマンドのヘルプ表示

qni-cli の利用者として、Pauli 文字列の期待値計算方法を確認するために、
`qni expect` の使い方をヘルプで見たい。

## Scenario: qni expect は成功する

- When "qni expect" を実行
- Then コマンドは成功

## Scenario: qni expect は有限ショット数のオプションを表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  [--shots N]      # Estimate from N measurements per setting
  ```

## Scenario: qni expect は再現用 seed のオプションを表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  [--seed N]       # Use an unsigned 32-bit seed for reproducible estimates
  ```

## Scenario: qni expect は不安定判定のオプションを表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  [--threshold N]  # Mark an absolute value at or below N as unstable (0 to 1)
  ```

## Scenario: 同軸相関だけでも有限ショット用オプションを利用できると表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni expect --same-axis-correlations K [--shots N] [--seed N] [--threshold N] [--json]
  ```

## Scenario: 同軸相関の LaTeX は有限ショット用オプションと別の Usage で表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni expect --same-axis-correlations K --latex
  ```

## Scenario: qni expect は有限ショットの例を表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni expect ZZ XX --shots 1000 --seed 42
  ```

## Scenario: qni expect は LaTeX の併用制限を表示

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  --latex cannot be used with --shots, --seed, --threshold, or --json.
  ```
