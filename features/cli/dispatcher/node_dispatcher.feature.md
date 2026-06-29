# Feature: Node dispatcher

qni CLI の配布 entrypoint として
Node dispatcher は TypeScript 実装へ処理を渡し
Ruby 実行時なしでコマンドを実行できる必要がある。

## Scenario: Node dispatcher は TypeScript 実装へ渡したコマンドを成功させる

- Given 空の 1 qubit 回路がある
- When Node dispatcher で "qni view" を実行
- Then コマンドは成功

## Scenario: Node dispatcher は TypeScript 実装の標準出力を返す

- Given 空の 1 qubit 回路がある
- When Node dispatcher で "qni view" を実行
- Then 標準出力:

  ```text
  q0: ─
  ```
