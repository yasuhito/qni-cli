# Feature: qni clear help

qni-cli のユーザとして
clear コマンドの使い方を知るために
qni clear の help を見たい

## Scenario: qni clear --help は成功する

- When "qni clear --help" を実行
- Then コマンドは成功

## Scenario: qni clear --help は clear コマンドの使い方を表示

- When "qni clear --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni clear

  Overview:
    Delete ./circuit.json.
    If ./circuit.json does not exist, qni clear still succeeds.
    Standard output is empty on success.

  Examples:
    qni clear
  ```
