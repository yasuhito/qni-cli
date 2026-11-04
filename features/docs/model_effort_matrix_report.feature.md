# Feature: 保存済みの思考量比較から表と図を再生成する

比較結果の読者として
モデルを再び呼ばずに結果を確認するために
保存済みの記録と出典から21条件の比較表と折れ線図を再生成したい。

## Scenario: 報告書はモデル呼び出しなしの検証方法を示す

- Then リポジトリファイル "docs/reports/model-effort-matrix-2026-11-04.md" は "node scripts/plot_model_effort_matrix.js --check" を含む

## Scenario: 継続した2条件の失敗試行の消費量を明示する

- Then リポジトリファイル "docs/reports/model-effort-matrix-2026-11-04.md" は "全試行の出力・費用は不明" を含む

## Scenario: 異なる時間上限を同一条件とは記載しない

- Then リポジトリファイル "docs/reports/model-effort-matrix-2026-11-04.md" は "300秒・600秒・3,600秒" を含む

## Scenario: 思考内訳の独立した再導出に必要な非公開入力を説明する

- Then リポジトリファイル "docs/reports/model-effort-matrix-2026-11-04.md" は "reasoning 索引の独立した再導出には非公開の生ログが必要" を含む

## Scenario: 単一観測に架空の信頼区間を付けない

- Then リポジトリファイル "docs/reports/model-effort-matrix-2026-11-04.md" は "信頼区間は付けない" を含む
