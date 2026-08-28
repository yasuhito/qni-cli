# Feature: 本文の数式を画像で描く

qni-cli を Pi に導入した利用者として
共同研究者の数式を論文と同じ見た目で読めるように
本文の LaTeX を端末画像の配置へ変換したい

## Scenario: インライン数式を前景色だけの画像配置へ変換する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{0}$` を含む本文を画像経路で変換する
- Then 変換後の Markdown は先頭 1 行に転送を持ち、前景色だけのプレースホルダーを持つ

## Scenario: 表示数式とインライン数式をそれぞれの高さで配置する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 表示数式とインライン数式を含む本文を画像経路で変換する
- Then 表示数式は独立した複数行、インライン数式は本文中の 1 行として配置される

## Scenario: 4 種類の区切りをすべて画像へ変換する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 4 種類の数式区切りを含む本文を画像経路で変換する
- Then 4 つの数式が画像配置になる

## Scenario: 複数の数式の転送を先頭 1 行にまとめる

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 2 つの数式を含む本文を画像経路で変換する
- Then 変換後の Markdown の転送行は 1 行だけになる

## Scenario: コードフェンスとインラインコードの数式を変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When コードと通常の数式を含む本文を画像経路で変換する
- Then コード内の数式は残り、通常の数式だけが画像配置になる

## Scenario: thinking ブロックの数式を変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When thinking ブロックの本文を画像経路で変換する
- Then thinking ブロックの本文は変更されない

## Scenario: Bell 状態を量子系マクロで組版する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `\ket{\Phi^+}=\frac{\ket{00}+\ket{11}}{\sqrt 2}` を画像経路で変換する
- Then Bell 状態は設定なしで画像配置になる

## Scenario: 画像経路で起動した拡張の状態を確認する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `/math status` を実行する
- Then Pi の状態表示にパッケージの版と固定の画像経路がある
