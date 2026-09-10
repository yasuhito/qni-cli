---
summary: pi-formula 0.1.1 を同梱する qni-cli 0.2.2 更新
---

# qni-cli 0.2.2: pi-formula 0.1.1 への更新

qni-cli 0.2.2 は `pi-formula` 0.1.1 を完全固定して同梱します。Pi のテーマ色と端末背景のコントラストが不足する場合でも、表示数式と `qni run --latex` などの qni ツール結果を見やすく描画するための更新です。

更新後は次を実行してください。

```bash
pi install npm:qni-cli
```

`pi-formula` の公開インターフェースは互換であり、qni-cli の量子系マクロ、`/formula`、専用 `qni` ツールの使い方に変更はありません。

## 確認

`npm run check` は成功しました。2026-09-11 に Arch Linux 上で `scripts/dev/verify_qni_formula_tool.sh` を実行し、Ghostty 1.3.1 と Kitty 0.48.2 の両方で、専用 `qni` ツールが `run --latex` を実行して返す Bell 状態を確認しました。各実行は LaTeX の toolResult を検査してから画面を取得しており、数式画像が画面上で表示されることを確認済みです。

- [Ghostty の画面](../reports/pi-formula-0.1.1-ghostty.png)
- [Kitty の画面](../reports/pi-formula-0.1.1-kitty.png)
