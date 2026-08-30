# Feature: 本文の数式を端末で読みやすく描く

qni-cli を Pi に導入した利用者として
共同研究者の数式を読みやすくしたい
インライン数式は Unicode テキストで、表示数式は端末画像で描きたい

## Scenario: インライン数式を Unicode テキスト経路へ残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$x$` を含む本文を画像経路で変換する
- Then 単純なインライン数式は Markdown のまま残る

## Scenario: 丸括弧区切りのインライン数式を Unicode テキスト経路へ残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `\(x\)` を含む本文を画像経路で変換する
- Then 丸括弧区切りのインライン数式は Markdown のまま残る

## Scenario: 表示数式の画像配置に画像IDと配置IDを使う

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$$x$$` を含む本文を画像経路で変換する
- Then 変換後のプレースホルダーは画像IDと配置IDを使う

## Scenario: 表示数式を独立した複数行に配置する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 表示数式とインライン数式を含む本文を画像経路で変換する
- Then 表示数式は独立した複数行に配置される

## Scenario: インライン数式を本文の 1 行に残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 表示数式とインライン数式を含む本文を画像経路で変換する
- Then インライン数式は本文中の Markdown のまま残る

## Scenario: 小さな数式を高い画素密度で描く

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$$x$$` を含む本文を画像経路で変換する
- Then 転送する PNG は配置する端末セルの 2 倍の画素密度を持つ

## Scenario: 表示数式を本文より大きく描く

- When 単純な表示数式を端末セルに組版する
- Then 表示数式の内容は端末セル高の 65 パーセント以上 70 パーセント未満になる

## Scenario: 背の高いインライン数式も Unicode テキスト経路へ残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 背の高いインライン数式を画像経路で変換する
- Then 背の高いインライン数式は Markdown のまま残る

## Scenario: Pauli 相関のインライン数式も Unicode テキスト経路へ残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When Pauli 相関のインライン数式を画像経路で変換する
- Then Pauli 相関のインライン数式は Markdown のまま残る

## Scenario: Kitty 仮想配置付きで PNG を転送する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When `$$x$$` を含む本文を画像経路で変換する
- Then PNG 転送は同じ命令で仮想配置とセル寸法を指定する

## Scenario: 表示数式の区切りだけを画像へ変換する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 4 種類の数式区切りを含む本文を画像経路で変換する
- Then 2 つの表示数式が画像配置になる

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

## Scenario: 画像経路でもインラインの利用者マクロを展開する

- Given `\op` を `\hat{#1}` に展開する環境変数で数式描画拡張を起動する
- When `$\op{H}$` を含む本文を画像経路で変換する
- Then 変換後の Markdown は `$\hat{H}$` を含む

## Scenario: 設定ファイルの利用者マクロをテキスト経路で展開する

- Given `\op` を `\hat{#1}` に展開する設定ファイルでテキスト経路を起動する
- When `$\op{H}$` を含む本文を変換する
- Then 変換後の Markdown は `$\hat{H}$` を含む

## Scenario: 環境変数の利用者マクロを設定ファイルより優先する

- Given `\op` の定義が異なる環境変数と設定ファイルでテキスト経路を起動する
- When `$\op{H}$` を含む本文を変換する
- Then 変換後の Markdown は `$\widetilde{H}$` を含む

## Scenario: 壊れた利用者マクロでも既定マクロを使う

- Given 壊れた JSON の利用者マクロで数式描画拡張を起動する
- When `\ket{\Phi^+}=\frac{\ket{00}+\ket{11}}{\sqrt 2}` を画像経路で変換する
- Then Bell 状態は設定なしで画像配置になる

## Scenario: 壊れた利用者マクロの理由を確認する

- Given 壊れた JSON の利用者マクロで数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示に利用者マクロのエラーがある

## Scenario: 引数の数を超える参照を利用者マクロのエラーにする

- Given 1 引数なのに `#2` を参照する利用者マクロで数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示に利用者マクロのエラーがある

## Scenario: ストリーミング中の未完成な数式を原文のまま残す

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When ストリーミング中に `状態 $\frac{1}{\sqrt 2}` まで届いた本文を変換する
- Then 未完成な数式は原文のまま返る

## Scenario: 同じ数式の画像 ID を再利用する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When 同じ数式を 2 回変換する
- Then 2 回の変換で同じ画像 ID が使われる

## Scenario: テーマ変更後の本文色で数式を描き直す

- Given 薄い本文色で数式描画拡張を起動する
- When 本文色を濃くして同じ数式を再変換する
- Then テーマ変更後の数式画像 ID は変わる

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

## Scenario: PNG 問い合わせに成功した端末では画像経路を選ぶ

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示に画像経路と問い合わせ成功がある

## Scenario: 実際に使う PNG 形式で端末へ問い合わせる

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When 端末へ送った問い合わせを確認する
- Then 問い合わせは `a=q` と PNG の `f=100` を使う

## Scenario: 分割された端末応答を読む

- Given PNG 問い合わせの `OK` を分割して返す偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示に画像経路と問い合わせ成功がある

## Scenario: 端末応答と同時に届いた入力を残す

- Given 通常入力と PNG 問い合わせの `OK` をまとめて返す偽の端末で数式描画拡張を起動する
- When 端末応答の前後にあった入力を確認する
- Then 通常入力だけが Pi へ残る

## Scenario: PNG 問い合わせを拒否した端末ではテキスト経路を選ぶ

- Given PNG 問い合わせに `EINVAL: unsupported format` を返す偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示にテキスト経路と問い合わせ拒否がある

## Scenario: PNG 問い合わせに応答しない端末ではテキスト経路を選ぶ

- Given PNG 問い合わせに応答しない偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示にテキスト経路と無応答がある

## Scenario: tmux では端末へ問い合わせない

- Given `TMUX` が設定された偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示にテキスト経路と `TMUX` があり端末問い合わせはない

## Scenario: screen では端末へ問い合わせない

- Given `TERM=screen` が設定された偽の端末で数式描画拡張を起動する
- When `/math status` を実行する
- Then Pi の状態表示にテキスト経路と `TERM=screen` があり端末問い合わせはない

## Scenario: 手動指定を同じセッションの再開後も使う

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When `/math text` を実行して同じセッションを再開し `/math status` を実行する
- Then Pi の状態表示にテキスト経路と手動指定がある

## Scenario: 問い合わせ失敗後に画像経路を手動指定する

- Given PNG 問い合わせに `EINVAL: unsupported format` を返す偽の端末で数式描画拡張を起動する
- When `/math image` と `/math status` を実行する
- Then Pi の状態表示に画像経路と手動指定がある

## Scenario: 自動判定へ戻す

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When `/math text` のあと `/math auto` と `/math status` を実行する
- Then Pi の状態表示に画像経路と問い合わせ成功がある

## Scenario: 全体既定を新しいセッションで使う

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When `/math text --default` を実行して新しいセッションで `/math status` を実行する
- Then Pi の状態表示にテキスト経路と全体既定がある

## Scenario: 全体既定を消して自動判定へ戻す

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When `/math text --default` のあと新しいセッションで `/math auto --default` と `/math status` を実行する
- Then Pi の状態表示に画像経路と問い合わせ成功がある

## Scenario: 画像経路を Pi 全体の画像判定へ反映する

- Given PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する
- When Pi の画像判定を確認する
- Then Pi 全体の画像判定は画像可である

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
