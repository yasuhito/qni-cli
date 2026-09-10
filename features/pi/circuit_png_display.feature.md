# Feature: qni ツールの回路図画像表示

量子回路を説明する共同研究者として
画像を表示できる端末では回路図を画像で示し
画像を表示できない端末では同じ回路を ASCII 図で示したい。

## Scenario: 画像経路では qni view の回路図を PNG で描く

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで H ゲートを追加して回路を表示する
- Then qni ツールの結果描画は Image 部品である

## Scenario: テキスト経路では qni view の ASCII 図を描く

- Given テキスト経路の pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで H ゲートを追加して回路を表示する
- Then qni ツールの回路図結果描画は ASCII 図の文字列である
