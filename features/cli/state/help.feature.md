# Feature: qni state help

qni-cli のユーザとして
初期状態ベクトルの管理方法を知るために
qni state の help を見たい

## Scenario: qni state は成功する

- When "qni state" を実行
- Then コマンドは成功

## Scenario: qni state は state コマンドの使い方を表示

- When "qni state" を実行
- Then 標準出力:

  ```text
  Usage:
    qni state set "alpha|0> + beta|1>"
    qni state show
    qni state clear

  Overview:
    Manage the initial state vector in ./circuit.json.
    The first release supports 1-qubit ket sums such as alpha|0> + beta|1>.
    Coefficients can be numeric literals or ASCII identifiers such as alpha.
    qni state clear removes the explicit initial state and falls back to |0>.

  Examples:
    qni state set "alpha|0> + beta|1>"
    qni state show
    qni state clear
  ```

## Scenario: qni state --help は成功する

- When "qni state --help" を実行
- Then コマンドは成功

## Scenario: qni state --help は state コマンドの使い方を表示

- When "qni state --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni state set "alpha|0> + beta|1>"
    qni state show
    qni state clear

  Overview:
    Manage the initial state vector in ./circuit.json.
    The first release supports 1-qubit ket sums such as alpha|0> + beta|1>.
    Coefficients can be numeric literals or ASCII identifiers such as alpha.
    qni state clear removes the explicit initial state and falls back to |0>.

  Examples:
    qni state set "alpha|0> + beta|1>"
    qni state show
    qni state clear
  ```
