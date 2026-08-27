# Feature: モデル別コストベンチマークの利用手順

qni-cli の利用者として
実モデルを呼び出す前に Pi の準備、実行方法、指標、制限事項を確認するために
モデル別コストベンチマークの文書を読みたい。

## Scenario: 利用手順ドキュメントは存在する

- Then リポジトリファイル "docs/model-cost-benchmark.md" は存在する

## Scenario: README はモデル別コストベンチマーク文書へリンクする

- Then リポジトリファイル "README.md" は "[モデル別コストベンチマーク利用手順](docs/model-cost-benchmark.md)" を含む

## Scenario: ドキュメントは Pi のモデル認証確認を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "pi auth check --model z-ai/glm-5.3-flash --json" を含む

## Scenario: ドキュメントはモデルと思考量を必須指定する

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "--thinking max" を含む

## Scenario: ドキュメントは課題選択を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "--task basic-gates/state-flip" を含む

## Scenario: ドキュメントは score と cost per problem の計算式を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "cost.perProblemUsd = totalUsd / total" を含む

## Scenario: ドキュメントは record と solve の AI 呼び出し範囲を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "`solve` は道具なしのモデル筆記試験です。" を含む

## Scenario: ドキュメントは初期範囲外の項目を示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "複数モデルの一括実行" を含む

## Scenario: ドキュメントは自動チェックが実 API を呼ばないことを示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "自動テストは偽 Pi を使い、実モデルを呼びません。" を含む
