# Feature: Ruby fallback 削除前の CLI エラー互換性

qni-cli のメンテナとして
Ruby fallback を削除する前に TypeScript 経路だけで CLI エラーを返せるように
代表的なヘルプ・不正引数・未知コマンドの挙動を固定したい

## Scenario: 未知の最上位コマンドは Ruby fallback なしでエラーを表示する

- When "qni __missing_command__" を実行
- Then 標準エラー:

  ```text
  Could not find command "__missing_command__".
  ```

## Scenario: add の未知オプションは Ruby 互換のエラーを表示する

- When "qni add H --qubit 0 --step 0 --unexpected" を実行
- Then 標準エラー:

  ```text
  ERROR: "qni add" was called with arguments ["H", "--unexpected"]
  Usage: "qni add GATE --qubit=N --step=N --qubit=QUBIT --step=N"
  ```

## Scenario: run の未知オプションは Ruby 互換のエラーを表示する

- When "qni run --bad" を実行
- Then 標準エラー:

  ```text
  ERROR: "qni simulate" was called with arguments ["--bad"]
  Usage: "qni run"
  ```

## Scenario: export の未知オプションは Ruby 互換のエラーを表示する

- When "qni export --bad" を実行
- Then 標準エラー:

  ```text
  ERROR: "qni export" was called with arguments ["--bad"]
  Usage: "qni export"
  ```

## Scenario: view の未知オプションは Ruby 互換のエラーを表示する

- When "qni view --bad" を実行
- Then 標準エラー:

  ```text
  ERROR: "qni view" was called with arguments ["--bad"]
  Usage: "qni view"
  ```
