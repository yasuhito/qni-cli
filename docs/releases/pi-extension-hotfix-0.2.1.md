---
summary: Pi 拡張の実行時依存を解消する 0.2.1 修正
---

# qni-cli 0.2.1: Pi 拡張の修正

qni-cli 0.2.0 では、`pi install npm:qni-cli` で導入した qni ツール拡張が、Pi 本体の内部モジュールを実行時に解決できず読み込めない問題がありました。

0.2.1 では出力切り詰めを qni-cli 内で実装し、Pi 本体の内部モジュールを実行時に読み込まないようにしました。Pi の利用者は更新後に次を実行してください。

```bash
pi install npm:qni-cli
```

`/formula`、`skill:qni-cli`、qni ツールが利用可能になります。
