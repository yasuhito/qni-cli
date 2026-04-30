# Feature: gate コマンドのヘルプ表示

qni-cli のユーザとして、指定した circuit slot のゲート取得方法を確認するために、
`qni gate` の使い方をヘルプで見たい。

## Scenario: qni gate は gate コマンドの使い方を表示

- When "qni gate" を実行
- Then コマンドは成功して標準出力:

  ```text
  Usage:
    qni gate --qubit=N --step=N

  Overview:
    Print one serialized cell value from ./circuit.json.
    step and qubit are 0-based indices.
    If the cell contains "H", qni gate prints H.

  Options:
    --step=N   # 0-based step index
    --qubit=N  # 0-based qubit index

  Examples:
    qni gate --qubit 0 --step 0
  ```

## Scenario: qni gate --help は gate コマンドの使い方を表示

- When "qni gate --help" を実行
- Then コマンドは成功して標準出力:

  ```text
  Usage:
    qni gate --qubit=N --step=N

  Overview:
    Print one serialized cell value from ./circuit.json.
    step and qubit are 0-based indices.
    If the cell contains "H", qni gate prints H.

  Options:
    --step=N   # 0-based step index
    --qubit=N  # 0-based qubit index

  Examples:
    qni gate --qubit 0 --step 0
  ```
