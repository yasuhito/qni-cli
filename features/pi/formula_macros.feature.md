# Feature: pi-formula に量子系マクロを登録する

qni-cli と pi-formula を併用する研究者として
量子状態を表示数式で説明したい
`\ket`、`\bra`、`\braket` を設定なしで画像として読めるようにする

## Scenario: 量子系マクロを pi-formula の表示数式で組版する

- Given 偽の Pi ExtensionAPI に数式描画拡張を登録する
- When pi-formula の変換器で `\ket{\psi}`、`\bra{\psi}`、`\braket{\phi|\psi}` を含む表示数式を変換する
- Then pi-formula の変換結果は画像配置になる

## Scenario: pi-formula がない環境でも数式描画拡張を登録できる

- Given pi-formula がない偽の Pi ExtensionAPI に数式描画拡張を登録する
- Then 数式描画拡張の登録は成功する

## Scenario: 想定外の pi-formula 版でも数式描画拡張を登録できる

- Given 想定外の版の pi-formula を返す偽の Pi ExtensionAPI に数式描画拡張を登録する
- Then 数式描画拡張の登録は成功する
