# Feature: qni variable help

qni-cli のユーザとして
variable コマンドの使い方を知るために
qni variable の help を見たい

## Scenario: qni variable は成功する

- When "qni variable" を実行
- Then コマンドは成功

## Scenario: qni variable は variable コマンドの使い方を表示

- When "qni variable" を実行
- Then 標準出力:

  ```text
  Usage:
    qni variable set NAME ANGLE
    qni variable list
    qni variable unset NAME
    qni variable clear

  Overview:
    Manage symbolic angle variables in ./circuit.json.
    NAME must be an ASCII identifier such as theta.
    ANGLE must be concrete, such as π/4, pi/3, or 0.5.
    qni variable set requires ./circuit.json to already exist.
    qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
    qni run and qni expect resolve symbolic angles through these variables.

  Examples:
    qni variable set theta π/4
    qni variable list
    qni variable unset theta
    qni variable clear
  ```

## Scenario: qni variable --help は成功する

- When "qni variable --help" を実行
- Then コマンドは成功

## Scenario: qni variable --help は variable コマンドの使い方を表示

- When "qni variable --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni variable set NAME ANGLE
    qni variable list
    qni variable unset NAME
    qni variable clear

  Overview:
    Manage symbolic angle variables in ./circuit.json.
    NAME must be an ASCII identifier such as theta.
    ANGLE must be concrete, such as π/4, pi/3, or 0.5.
    qni variable set requires ./circuit.json to already exist.
    qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
    qni run and qni expect resolve symbolic angles through these variables.

  Examples:
    qni variable set theta π/4
    qni variable list
    qni variable unset theta
    qni variable clear
  ```
