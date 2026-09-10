# Feature: pi-formula に量子系マクロを登録する

qni-cli と pi-formula を併用する研究者として
量子状態を表示数式で説明したい
`\ket`、`\bra`、`\braket` を設定なしで画像として読めるようにする

## Scenario: 量子系マクロを pi-formula の表示数式で組版する

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When pi-formula の変換器で `\ket{\psi}`、`\bra{\psi}`、`\braket{\phi|\psi}` を含む表示数式を変換する
- Then pi-formula の変換結果は画像配置になる

## Scenario: qni ツール拡張は数式描画器を登録しない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- Then qni ツール拡張が登録する Markdown 変換器はない

## Scenario: qni ツール拡張は `/formula` を重複登録しない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- Then `/formula` は一つだけ登録される
