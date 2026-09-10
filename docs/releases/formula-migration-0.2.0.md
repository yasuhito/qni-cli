---
summary: qni-cli 0.2.0 の数式描画移行と互換性変更
read_when:
  - qni-cli 0.2.0 へ更新する時
  - Pi の数式描画や qni ツール結果が表示されない時
---

# qni-cli 0.2.0: pi-formula への数式描画移行

qni-cli 0.2.0 は `pi-formula` 0.1.0 を完全固定して依存します。数式描画コード、`/formula`、利用者マクロ、表示経路の設定の正本は `pi-formula` です。qni-cli は量子系マクロと専用 `qni` ツールを追加します。

通常どおり次の一回の導入で両方を利用できます。

```sh
pi install npm:qni-cli
```

## 互換性変更

この版では qni-cli 固有の数式描画拡張 `qni-math` を削除しました。`/math` は使えません。代わりに `/formula status`、`/formula image`、`/formula text`、`/formula auto`、`/formula clear` を使います。

次の qni-cli 固有設定も使えません。

- `~/.config/qni-cli/qni-math.json`（または `$XDG_CONFIG_HOME/qni-cli/qni-math.json`）
- `QNI_MATH_MACROS`

利用者マクロと既定の表示経路は pi-formula の `$XDG_CONFIG_HOME/pi-formula/config.json`（未設定時は `~/.config/pi-formula/config.json`）と `PI_FORMULA_MACROS` へ移してください。書式は pi-formula の README を参照してください。

`qni` ツールの `run --latex` や `expect --latex` の結果は、pi-formula が画像経路を選んだときに画像として表示します。画像非対応の端末、tmux、screen では安全にテキスト表示になります。

## 実端末確認

2026-09-10 に Arch Linux で pi-formula 0.1.0、Ghostty 1.3.1、Kitty 0.48.2 を使い、ヘッドレスの実端末を起動して確認しました。Ghostty と Kitty の両方で、次を確認済みです。

1. 量子系マクロ `\ket`、`\bra`、`\braket` を含む表示数式が MathJax の画像として表示される。
2. 固定応答プロバイダが専用 `qni` ツールで Bell 回路の作成と `run --latex` を実行し、その結果 `\frac{\sqrt{2}}{2}\ket{00} + \frac{\sqrt{2}}{2}\ket{11}` がツール結果内で画像として表示される。
3. 画面取得に異常な水平帯はなく、式とツール結果を読み取れる。

表示数式は pi-formula の `scripts/verify-display --theme dark --terminal ghostty|kitty docs/agents/verify-corpus/issue-48.md` で確認しました。qni ツール結果は qni-cli の `scripts/dev/verify_qni_formula_tool.sh ghostty|kitty` で確認しました。この脚本は一時セッションで固定応答プロバイダを起動し、実際の qni ツール呼び出しによる `run --latex` の toolResult が成功し、期待する Bell 状態の LaTeX を保持したことを確認してから画面を取得します。画面上で数式画像が表示されていることを確認した取得物は、[Ghostty](../reports/formula-migration-0.2.0-ghostty.png) と [Kitty](../reports/formula-migration-0.2.0-kitty.png) に保存しています。どちらも `npm run check` には含めません。
