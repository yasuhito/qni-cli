# Feature: 数式描画拡張の状態確認

qni-cli を Pi に導入した利用者として
数式描画の準備状況を確認できるように
`/math status` で拡張の版と現在の経路を知りたい

## Scenario: テキスト経路で起動した拡張の状態を確認する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `/math status` を実行する
- Then Pi の状態表示にパッケージの版と固定のテキスト経路がある
