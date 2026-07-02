# Feature: モデル別コストベンチマークの利用手順

qni-cli の利用者として
実 API を呼び出す前に設定、実行方法、指標、制限事項を確認するために
モデル別コストベンチマークの文書を読みたい。

## Scenario: 利用手順ドキュメントは存在する

- Then リポジトリファイル "docs/model-cost-benchmark.md" は存在する

## Scenario: README はモデル別コストベンチマーク文書へリンクする

- Then リポジトリファイル "README.md" は "[モデル別コストベンチマーク利用手順](docs/model-cost-benchmark.md)" を含む

## Scenario: ドキュメントはモデル登録ファイルの最小スキーマを示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "gpt-4-1-mini:" を含む

## Scenario: ドキュメントは APIキー環境変数の扱いを示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "APIキーの値はリポジトリに保存しません。モデル登録ファイルには、APIキーを読む環境変数名だけを書きます。" を含む

## Scenario: ドキュメントは solve の単一モデル・単一試行・逐次実行を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "この実行は、単一モデル・単一試行・逐次実行です。" を含む

## Scenario: ドキュメントは plot の HTML 出力の読み方を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "横軸は `cost per problem` です。単位は USD で、線形スケールです。" を含む

## Scenario: ドキュメントは score と cost per problem の計算式を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "cost.perProblemUsd = totalUsd / score.total" を含む

## Scenario: ドキュメントは record と solve の AI 呼び出し範囲を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "`qni research record` は AI を呼びません。" を含む

## Scenario: ドキュメントは初期スコープ外の項目を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "複数モデルの一括実行。" を含む

## Scenario: ドキュメントは実 API 手動確認が check の必須条件でないことを示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "実 API での確認は任意です。`npm run check` の必須条件ではありません。" を含む
