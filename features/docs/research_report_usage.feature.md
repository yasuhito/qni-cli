# Feature: 研究試行レポートの利用手順

qni-cli の利用者として
保存済み研究試行を後から確認するために
研究試行レポートの使い方をドキュメントで確認したい。

## Scenario: ドキュメントは人間向けレポートのコマンドを示す

- Then リポジトリファイル "docs/benchmark.md" は "保存済み研究試行を読むには `qni research report` を実行します。" を含む

## Scenario: ドキュメントは JSON レポートのコマンドを示す

- Then リポジトリファイル "docs/benchmark.md" は "機械処理には `qni research report --json` を使います。" を含む
