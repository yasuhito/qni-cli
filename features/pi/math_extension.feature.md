# Feature: 本文の数式を画像で描く

qni-cli を Pi に導入した利用者として
共同研究者の数式を論文と同じ見た目で読めるように
本文の LaTeX を端末画像の配置へ変換したい

## Scenario: インライン数式の転送を本文の先頭に置く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{0}$` を含む本文を画像経路で変換する
- Then 変換後の Markdown の先頭行に画像転送がある

## Scenario: インライン数式の画像配置に前景色だけを使う

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{0}$` を含む本文を画像経路で変換する
- Then 変換後のプレースホルダーは前景色だけを使う

## Scenario: 表示数式を独立した複数行に配置する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 表示数式とインライン数式を含む本文を画像経路で変換する
- Then 表示数式は独立した複数行に配置される

## Scenario: インライン数式を本文の 1 行に配置する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 表示数式とインライン数式を含む本文を画像経路で変換する
- Then インライン数式は本文中の 1 行に配置される

## Scenario: 4 種類の区切りをすべて画像へ変換する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 4 種類の数式区切りを含む本文を画像経路で変換する
- Then 4 つの数式が画像配置になる

## Scenario: 複数の数式の転送を先頭 1 行にまとめる

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 2 つの数式を含む本文を画像経路で変換する
- Then 変換後の Markdown の転送行は 1 行だけになる

## Scenario: コードフェンスの数式を変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When コードと通常の数式を含む本文を画像経路で変換する
- Then コードフェンス内の数式は残る

## Scenario: インラインコードの数式を変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When コードと通常の数式を含む本文を画像経路で変換する
- Then インラインコード内の数式は残る

## Scenario: コード外の数式を変換する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When コードと通常の数式を含む本文を画像経路で変換する
- Then コード外の数式は画像配置になる

## Scenario: 引用内のコードフェンスを変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 引用内のコードフェンスを含む本文を画像経路で変換する
- Then 引用内のコードフェンスにある数式は残る

## Scenario: thinking ブロックの数式を変換しない

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When thinking ブロックの本文を画像経路で変換する
- Then thinking ブロックの本文は変更されない

## Scenario: Bell 状態を量子系マクロで組版する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `\ket{\Phi^+}=\frac{\ket{00}+\ket{11}}{\sqrt 2}` を画像経路で変換する
- Then Bell 状態は設定なしで画像配置になる

## Scenario: ストリーミング中の未完成な数式を原文のまま残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When ストリーミング中に `状態 $\frac{1}{\sqrt 2}` まで届いた本文を変換する
- Then 未完成な数式は原文のまま返る

## Scenario: 同じ数式の画像 ID を再利用する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 同じ数式を 2 回変換する
- Then 2 回の変換で同じ画像 ID が使われる

## Scenario: 利用可能幅に合わせて表示数式の列数を変える

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 長い表示数式を異なる利用可能幅で変換する
- Then 表示数式の列数が変わる

## Scenario: 利用可能幅の変更後に表示数式を再転送する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 長い表示数式を異なる利用可能幅で変換する
- Then 転送画像 ID が変わる

## Scenario: 不正な数式を原文のまま残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 不正な数式と正しい数式を含む本文を変換する
- Then 不正な数式は原文のまま残る

## Scenario: 不正な数式があっても正しい数式を画像にする

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 不正な数式と正しい数式を含む本文を変換する
- Then 正しい数式は画像になる

## Scenario: 数式描画のキャッシュを消去する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 数式を変換して `/math clear` のあと `/math status` を実行する
- Then Pi の状態表示にキャッシュ件数 0 がある

## Scenario: 画像経路で起動した拡張の状態を確認する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `/math status` を実行する
- Then Pi の状態表示にパッケージの版と固定の画像経路がある

## Scenario: テキスト経路で ket を素の LaTeX に展開する

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{\psi}$` を含む本文を変換する
- Then 変換後の Markdown は `$|\psi\rangle$` を含む

## Scenario: テキスト経路で bra を素の LaTeX に展開する

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\bra{0}$` を含む本文を変換する
- Then 変換後の Markdown は `$\langle 0|$` を含む

## Scenario: テキスト経路で braket を素の LaTeX に展開する

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\braket{0}{1}$` を含む本文を変換する
- Then 変換後の Markdown は `$\langle 0|1\rangle$` を含む

## Scenario: テキスト経路で改行後のマクロ引数を展開する

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 引数の前に改行がある `\ket` を含む表示数式を変換する
- Then 変換後の Markdown は `|0\rangle` を含む

## Scenario: テキスト経路の Markdown を Unicode で描く

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{\psi} \otimes \ket{0}$` を含む本文を変換して Pi の Markdown 部品で描く
- Then 描画された行は `|ψ⟩ ⊗ |0⟩` を含む

## Scenario: テキスト経路の描画に量子系マクロの原文を残さない

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{\psi} \otimes \ket{0}$` を含む本文を変換して Pi の Markdown 部品で描く
- Then 描画された行に `\ket` はない

## Scenario: テキスト経路では画像を転送しない

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{\psi}$` を含む本文を変換する
- Then 変換後の Markdown に画像転送はない

## Scenario: テキスト経路では画像のプレースホルダーを置かない

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$\ket{\psi}$` を含む本文を変換する
- Then 変換後の Markdown に画像プレースホルダーはない

## Scenario: テキスト経路で起動した拡張の状態を確認する

- Given テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `/math status` を実行する
- Then Pi の状態表示に固定のテキスト経路がある
