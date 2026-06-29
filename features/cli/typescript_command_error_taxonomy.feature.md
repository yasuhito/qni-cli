# Feature: TypeScript コマンドのエラー分類

qni-cli のメンテナとして
TypeScript コマンド経路の CLI 検証エラーと回路ファイルのドメインエラーを分けるために
ユーザー向けエラー互換性を保ったまま責務境界を明確にしたい

## Scenario: CLI 検証エラー用のクラスが存在する

- Then リポジトリファイル "src/commands/command_error.ts" は "export class CommandError extends Error" を含む

## Scenario: gate コマンドの検証エラーは失敗する

- Given 空の 1 qubit 回路がある
- When "qni gate --qubit 1.0 --step 0" を実行
- Then コマンドは失敗

## Scenario: gate コマンドの検証エラーは標準エラー互換性を保つ

- Given 空の 1 qubit 回路がある
- When "qni gate --qubit 1.0 --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```

## Scenario: state コマンドの検証エラーは失敗する

- When "qni state set \"\"" を実行
- Then コマンドは失敗

## Scenario: state コマンドの検証エラーは標準エラー互換性を保つ

- When "qni state set \"\"" を実行
- Then 標準エラー:

  ```text
  initial state expression is required
  ```

## Scenario: variable コマンドの検証エラーは失敗する

- When "qni variable set theta" を実行
- Then コマンドは失敗

## Scenario: variable コマンドの検証エラーは標準エラー互換性を保つ

- When "qni variable set theta" を実行
- Then 標準エラー:

  ```text
  wrong number of arguments
  ```

## Scenario: gate コマンドの検証エラーは回路ファイルのドメインエラーより先に表示される

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni gate --qubit 1.0 --step 0" を実行
- Then 標準エラー:

  ```text
  qubit must be an integer
  ```

## Scenario: state コマンドの検証エラーは回路ファイルのドメインエラーより先に表示される

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni state set \"\"" を実行
- Then 標準エラー:

  ```text
  initial state expression is required
  ```

## Scenario: variable コマンドの検証エラーは回路ファイルのドメインエラーより先に表示される

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni variable set theta" を実行
- Then 標準エラー:

  ```text
  wrong number of arguments
  ```
