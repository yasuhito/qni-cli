# ADR 0024: 本文の数式画像化は Pi の公開 API だけで行う

## 状況

数式描画の画像経路では、エージェントの本文に書かれた LaTeX を画像にして端末に描く必要がある。先行実装の pi-math は、pi-tui の `Markdown.prototype.render` をプロセス全体で書き換え、描画中だけ内部テキストを差し替える方式でこれを実現している。この方式は実績があるが、Pi の非公開の内部構造に依存し、Pi の版が上がるたびに壊れる可能性がある。Pi 0.84 で Markdown 部品自身が LaTeX を Unicode 整形するようになった後の共存動作も確認されていない。

調査（`docs/research/pi-math-and-pi-rendering-api.md` 節 E）で、公式の `pi.registerMarkdownTransformer` が返す Markdown 文字列に Kitty グラフィックスのプレースホルダー文字、色指定、転送シーケンスを埋め込んでも、pi-tui の Markdown 部品がそれをそのまま端末行に通し、再描画時の画像の再送と削除も Pi の TUI が行うことが分かった。ただし実端末での目視は未検証である。

## 決定

本文の数式画像化は、Pi の公開 API（`registerMarkdownTransformer`、`registerTool` の描画、`registerCommand` など）だけで行い、pi-tui や Pi 本体の内部関数やプロトタイプを書き換えない。

- 画像の配置は Kitty の Unicode プレースホルダー方式で、Markdown 文字列の中に通常の文字として埋め込む。
- 画像の転送シーケンスは独立した行に置き、thinking ブロックは対象外にする。
- プロトタイプの第一目標を「Ghostty で実際に数式画像が表示される」ことの目視確認とする。表示できなかった場合は、この決定を見直すかどうかを改めて判断する。自動的に非公開 API へ切り替えることはしない。

## 結果

Pi の版更新に対して、数式描画拡張は公式に約束された範囲でしか壊れない。壊れた場合はテキスト経路に落ち、`/math status` で理由を確認できる。pi-math の実装をそのまま移植することはできず、組版（MathJax → SVG → PNG）と配置（プレースホルダー）を独自に実装する。

## 検討した選択肢

- pi-math と同じ `Markdown.prototype.render` の書き換え: 実績はあるが非公開 API に依存するため採らない。
- 本文は Unicode のテキスト経路に留め、画像はツール結果だけにする: 本文の数式を美しく読むという主目的を満たさないため採らない。
