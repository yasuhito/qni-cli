# Feature: TypeScript command error taxonomy

qni-cli のメンテナとして
TypeScript command route の CLI validation error と circuit file domain error を分けるために
ユーザー向けエラー互換性を保ったまま責務境界を明確にしたい

## Scenario: CLI validation error class が存在する

- Then リポジトリファイル "src/commands/command_error.ts" は "export class CommandError extends Error" を含む

## Scenario: gate command validation error は失敗する

- Given 空の 1 qubit 回路がある
- When "qni gate --qubit 1.0 --step 0" を実行
- Then コマンドは失敗

## Scenario: gate command validation error は stderr 互換性を保つ

- Given 空の 1 qubit 回路がある
- When "qni gate --qubit 1.0 --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```

## Scenario: state command validation error は失敗する

- When "qni state set \"\"" を実行
- Then コマンドは失敗

## Scenario: state command validation error は stderr 互換性を保つ

- When "qni state set \"\"" を実行
- Then 標準エラー:

  ```text
  initial state expression is required
  ```

## Scenario: variable command validation error は失敗する

- When "qni variable set theta" を実行
- Then コマンドは失敗

## Scenario: variable command validation error は stderr 互換性を保つ

- When "qni variable set theta" を実行
- Then 標準エラー:

  ```text
  wrong number of arguments
  ```
