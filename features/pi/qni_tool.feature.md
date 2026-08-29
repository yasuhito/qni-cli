# Feature: 専用 qni ツールで安全に量子回路を操作する

共同研究者（量子回路AIエージェント）として
利用者の回路を意図せず変更せずに
文字列配列をそのまま qni-cli に渡したい

## Scenario: qni ツールで回路を作って実行する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで H ゲートを追加して回路を実行する
- Then qni ツールの結果本文は qni-cli の標準出力と一致する

## Scenario: 作業場所を省略すると利用者の回路を変更しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- And Pi の作業場所に既存の回路がある
- When 作業場所を省略して qni ツールで H ゲートを追加する
- Then Pi の作業場所にある回路は変更されていない

## Scenario: 同じセッションの一時作業場所を共有する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 作業場所を省略して H ゲートを追加して回路を実行する
- Then 実行結果は先に追加した H ゲートを使う

## Scenario: reload 後も一時作業場所を共有する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 作業場所を省略して H ゲートを追加して拡張を reload して回路を実行する
- Then reload 後の実行結果は先に追加した H ゲートを使う

## Scenario: セッションを離れると一時作業場所を削除する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 各セッション終了理由で一時作業場所を終了する
- Then reload 以外の終了理由では一時作業場所が削除される

## Scenario: 保存されたシンボリックリンクを一時作業場所として復元しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 保存された一時作業場所が別のディレクトリへのシンボリックリンクである
- Then セッション終了時にリンク先のディレクトリを削除しない

## Scenario: ピリオドで Pi の作業場所を選ぶ

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `workdir: "."` で qni ツールを実行する
- Then qni ツールは Pi の作業場所を使う

## Scenario: Pi の作業場所内の子ディレクトリを選ぶ

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 既存の子ディレクトリを workdir に指定して qni ツールを実行する
- Then qni ツールは指定した子ディレクトリを使う

## Scenario: 存在しない作業場所を拒否する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 存在しない workdir で qni ツールを実行する
- Then qni ツールは作業場所を拒否する

## Scenario: 通常ファイルを作業場所として拒否する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 通常ファイルを workdir に指定して qni ツールを実行する
- Then qni ツールは作業場所を拒否する

## Scenario: 絶対パスの作業場所を拒否する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 絶対パスを workdir に指定して qni ツールを実行する
- Then qni ツールは作業場所を拒否する

## Scenario: 親ディレクトリへの移動を拒否する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When Pi の作業場所より外側を workdir に指定して qni ツールを実行する
- Then qni ツールは作業場所を拒否する

## Scenario: シンボリックリンクによる外側への移動を拒否する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 外側へのシンボリックリンクを workdir に指定して qni ツールを実行する
- Then qni ツールは作業場所を拒否する

## Scenario: 同じ作業場所への並行呼び出しを直列実行する

- Given qni-cli の実行順を記録する偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 同じ作業場所へ 2 回同時に qni ツールを呼ぶ
- Then qni ツールは呼び出した順に実行する

## Scenario: LaTeX の状態ベクトルを結果の詳細に保持する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then qni ツールの結果本文と結果詳細は同じ LaTeX である

## Scenario: LaTeX の状態ベクトルを画像経路で描く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then qni ツールの結果描画は Image 部品である

## Scenario: LaTeX の期待値を画像経路で描く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["expect", "ZZ", "--latex"]` を渡す
- Then qni ツールの結果描画は Image 部品である

## Scenario: LaTeX 以外の結果を文字列で描く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで H ゲートを追加して回路を実行する
- Then qni ツールの結果描画は文字列である

## Scenario: テキスト経路では LaTeX の結果を文字列で描く

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then qni ツールの結果描画は文字列である

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

## Scenario: qni ツールの説明から一括実行の失敗後の扱いが分かる

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの説明に一括実行と残りだけの再実行がある

## Scenario: qni ツールは引数と任意の作業場所を受け取る

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの引数スキーマに args と任意の workdir がある

## Scenario: 実際の作業場所を結果に保持する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["--help"]` を渡す
- Then qni ツールの結果詳細に実際の作業場所がある

## Scenario: 実際の作業場所を展開表示する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールに `["--help"]` を渡す
- Then qni ツールの展開表示に実際の作業場所がある

## Scenario: 組み込み bash ツールを上書きしない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 数式描画拡張が登録したツール名を確認する
- Then 数式描画拡張は bash ツールを登録していない

## Scenario: 複数コマンドを一括実行する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで X ゲートの追加と回路表示を一括実行する
- Then 一括実行の結果はコマンドごとの見出し付き本文である

## Scenario: 一括実行の見出しで特別な引数を引用する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで初期状態の設定と表示を一括実行する
- Then 一括実行の見出しは特別な引数だけを引用する

## Scenario Outline: 不正な一括実行入力をコマンド実行前に拒否する

- Given qni-cli の実行回数を記録する偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールへ不正な入力 <input> を渡す
- Then qni ツールは qni-cli を実行せず入力を拒否する

### Examples

| input |
| `args` と `commands` の両方 |
| `args` と `commands` の両方を省略 |
| 空の `commands` |
| 空のコマンドを含む `commands` |

## Scenario: 一括実行は最初の失敗で止まる

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで成功、失敗、未実行のコマンドを一括実行する
- Then 一括実行の失敗は成功分と停止位置を示して変更を残す

## Scenario: 同じ作業場所への呼び出しは一括実行の途中に割り込まない

- Given qni-cli の実行順を記録する偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 同じ作業場所へ一括実行と単一実行を同時に呼ぶ
- Then 単一実行は一括実行の後に動く

## Scenario: 一括実行の LaTeX を結果の詳細に保持する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 一括実行の結果詳細は LaTeX とコマンド引数を保持する

## Scenario: 一括実行の LaTeX を画像経路で描く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 一括実行の結果描画は見出し、文字列、Image 部品の順である

## Scenario: テキスト経路では一括実行の LaTeX を文字列で描く

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 一括実行の結果描画はすべて文字列である

## Scenario: 一括実行の標準出力をコマンドごとに切り詰める

- Given 大きな標準出力を返す偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで LaTeX コマンドを一括実行する
- Then 一括実行の出力は切り詰められて LaTeX を保持しない

## Scenario: 単一実行の標準出力を切り詰める

- Given 大きな標準出力を返す偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで LaTeX コマンドを単一実行する
- Then 単一実行の出力は切り詰められて LaTeX を保持しない

## Scenario: 一括実行のキャンセルを報告する

- Given キャンセル結果を返す偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールで複数コマンドを一括実行する
- Then qni ツールはキャンセルを終了ステータスなしで報告する

## Scenario: 単一実行のキャンセルを報告する

- Given キャンセル結果を返す偽の Pi ExtensionAPI に数式描画拡張を登録する
- When qni ツールでコマンドを単一実行する
- Then qni ツールはキャンセルを終了ステータスなしで報告する
