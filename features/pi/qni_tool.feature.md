# Feature: 専用 qni ツールで量子回路を操作する

共同研究者（量子回路AIエージェント）として
シェルの引用符やパイプ記号の解釈を避けるために
文字列配列をそのまま qni-cli に渡したい

## Scenario: qni ツールで回路を作って実行する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで H ゲートを追加して回路を実行する
- Then qni ツールの結果本文は qni-cli の標準出力と一致する

## Scenario: 空白とパイプ記号を含む初期状態をそのまま渡す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで `alpha|0> + beta|1>` を初期状態に設定して表示する
- Then qni ツールの結果本文は `alpha|0> + beta|1>` である

## Scenario: qni-cli の使い方を確認する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["--help"]` を渡す
- Then qni ツールの結果本文に qni-cli の使い方がある

## Scenario: 存在しないサブコマンドのエラーを返す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに存在しないサブコマンドを渡す
- Then qni ツールの失敗に qni-cli のエラーがある

## Scenario: 存在しないサブコマンドの終了ステータスを返す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに存在しないサブコマンドを渡す
- Then qni ツールの失敗に終了ステータス 1 がある

## Scenario: qni ツールの説明からヘルプの確認方法が分かる

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの説明に `["--help"]` がある

## Scenario: qni ツールは文字列配列だけを受け取る

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの引数スキーマは文字列配列 1 つである

## Scenario: 組み込み bash ツールを上書きしない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 数式描画拡張が登録したツール名を確認する
- Then 数式描画拡張は bash ツールを登録していない
