# Feature: expect コマンドのヘルプ表示

qni-cli のユーザとして、Pauli string の期待値計算方法を確認するために、
`qni expect` の使い方をヘルプで見たい。

## Scenario: qni expect は成功する

- When "qni expect" を実行
- Then コマンドは成功

## Scenario: qni expect は expect コマンドの使い方を表示

- When "qni expect" を実行
- Then 標準出力:

  ```text
  Usage:
    qni expect PAULI_STRING [PAULI_STRING...]

  Overview:
    Calculate expectation values from ./circuit.json.
    qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
    Each PAULI_STRING must use only I, X, Y, and Z.
    The length of each PAULI_STRING must match the circuit qubit count.
    Output is one line per observable in the form PAULI_STRING=value.

  Examples:
    qni expect Z
    qni expect ZZ XX
    qni expect ZZI IZZ XXX
  ```

## Scenario: qni expect --help は成功する

- When "qni expect --help" を実行
- Then コマンドは成功

## Scenario: qni expect --help は expect コマンドの使い方を表示

- When "qni expect --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni expect PAULI_STRING [PAULI_STRING...]

  Overview:
    Calculate expectation values from ./circuit.json.
    qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
    Each PAULI_STRING must use only I, X, Y, and Z.
    The length of each PAULI_STRING must match the circuit qubit count.
    Output is one line per observable in the form PAULI_STRING=value.

  Examples:
    qni expect Z
    qni expect ZZ XX
    qni expect ZZI IZZ XXX
  ```
