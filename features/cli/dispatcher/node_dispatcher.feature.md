# Feature: Node dispatcher

Ruby から TypeScript へ段階移行するために
qni CLI は Node dispatcher から既存 Ruby 実装へ委譲できる必要がある。

## Scenario: Node dispatcher は Ruby 実装へ委譲したコマンドを成功させる

- Given 空の 1 qubit 回路がある
- When Node dispatcher で "qni view" を実行
- Then コマンドは成功

## Scenario: Node dispatcher は Ruby 実装の標準出力を返す

- Given 空の 1 qubit 回路がある
- When Node dispatcher で "qni view" を実行
- Then 標準出力:

  ```text
  q0: ─
  ```

## Scenario: QNI_USE_RUBY override は Node dispatcher 経由でも成功する

- Given 空の 1 qubit 回路がある
- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- When Node dispatcher で "qni view" を実行
- Then コマンドは成功
