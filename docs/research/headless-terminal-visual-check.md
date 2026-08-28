---
summary: 'Ghostty と Kitty で数式描画を撮影し、画像経路を目視確認する手順'
read_when:
  - 数式描画の状態表示または本文画像を実端末で確認する時
  - Ghostty / Kitty のヘッドレス撮影手順を変更する時
---

# ヘッドレス端末での数式描画の目視確認

数式描画（画像経路）の確認は、人間の目ではなく AI エージェント自身が実端末の描画結果を画像として読む形で行う。この手順は 2026-08-28 に本機（Arch Linux、Hyprland、Ghostty 1.3.1、Kitty 0.48.2）で成立を確認した。

## 仕組み

1. `xvfb-run` で仮想 X ディスプレイを作る（利用者の画面には何も出ない）。
2. その中で本物の Ghostty または Kitty を X11 バックエンドで起動する。Wayland を掴まないよう `WAYLAND_DISPLAY` を外し、`GDK_BACKEND=x11`（Ghostty）、`-o linux_display_server=x11`（Kitty）、`LIBGL_ALWAYS_SOFTWARE=1` を指定する。
3. 端末の中で確認したいコマンド（Kitty グラフィックスの描画、Pi の再開など）を実行する。
4. ImageMagick の `import -window root` で画面を PNG に保存する。
5. エージェントがその PNG を読んで判断する。

## 確認済みの最小例

```bash
xvfb-run -a -s "-screen 0 1000x400x24 +extension GLX +render" bash -c '
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11; unset WAYLAND_DISPLAY
  ghostty --gtk-single-instance=false --confirm-close-surface=false \
    -e bash -c "python3 scripts/dev/kitty_probe_image.py; sleep 10" &
  sleep 6
  import -display "$DISPLAY" -window root /tmp/ghostty.png
  kill %1
'
```

Kitty の場合は `ghostty ...` を `kitty -o linux_display_server=x11 --detach=no -e bash -c "..."` に置き換える。`scripts/dev/kitty_probe_image.py` は Kitty グラフィックスプロトコルで赤い長方形を描く最小スクリプトで、描画されていれば画面取得の PNG に赤い領域が現れる。

## 数式描画拡張の状態を撮影する脚本

`qni-math` を含む現在の npm パッケージを一時環境へ導入し、Pi で `/math status` を実行した画面を撮影する。

```bash
scripts/dev/headless_qni_math_status.sh ghostty /tmp/qni-math-ghostty.png
scripts/dev/headless_qni_math_status.sh kitty /tmp/qni-math-kitty.png
```

脚本は `npm run check` には含めない。出力された PNG を読み、起動画面の拡張一覧に `qni-math` があることと、入力欄の下に版と `path: image (fixed)` が出ることを確認する。

本文の画像経路は、暗い・明るいテーマを Ghostty と Kitty で撮影する。

```bash
scripts/dev/headless_qni_math_images.sh ghostty dark /tmp/qni-math-ghostty-dark.png
scripts/dev/headless_qni_math_images.sh ghostty light /tmp/qni-math-ghostty-light.png
scripts/dev/headless_qni_math_images.sh kitty dark /tmp/qni-math-kitty-dark.png
scripts/dev/headless_qni_math_images.sh kitty light /tmp/qni-math-kitty-light.png
```

各 PNG で、インライン数式が本文の 1 行に収まり、Bell 状態の表示数式が独立した行に描かれていることを確認する。古い本文の残像と色の帯がないことも確認する。固定セッションは `scripts/dev/qni_math_session.jsonl` に置く。

ストリーミング中と完了後は、固定応答プロバイダを使って 2 枚続けて撮る。

```bash
scripts/dev/headless_qni_math_streaming.sh ghostty /tmp/qni-math-ghostty-streaming
```

出力は `/tmp/qni-math-ghostty-streaming-closed.png` と `/tmp/qni-math-ghostty-streaming-complete.png`。前者では区切りが閉じた数式が画像になっていること、後者では同じ数式を読めて `Working...` や古い行の残像がないことを確認する。`scripts/dev/qni_math_fixed_provider.ts` は応答を 3 区切りで流し、撮影脚本は数式を閉じた時点と応答完了時点を合図ファイルで待つ。

## 注意

- `WAYLAND_DISPLAY` を外さないと、端末は Xvfb ではなく利用者の Wayland 画面に開いてしまう。
- 起動直後は窓がまだ無いので、画面取得の前に数秒待つ。
- `xwininfo` は本機に無いので、窓単位ではなく root 全体を取得する。
- 静止した Pi の描画は、LLM を呼ばずに済むよう、数式を含むセッションファイルを再開して描画させる。ストリーミングの描画は固定応答プロバイダを使い、外部 API を呼ばない。

## 参照元

- 本機での実行結果（2026-08-28）: Ghostty と Kitty の両方で赤い長方形を含む PNG を取得。
- Kitty グラフィックスプロトコル: https://sw.kovidgoyal.net/kitty/graphics-protocol/
