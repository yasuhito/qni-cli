# Feature: qni view help

qni-cli のユーザとして
回路表示コマンドの使い方を迷わず確認できるように
qni view の help を表示したい。

## Scenario: qni view --help は成功する

- When "qni view --help" を実行
- Then コマンドは成功

## Scenario: qni view --help は view コマンドの使い方を表示

- When "qni view --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni view

  Overview:
    Render ./circuit.json as an ASCII circuit diagram.
    Output uses plain box-drawing text in non-TTY contexts.

  Examples:
    qni view
  ```
