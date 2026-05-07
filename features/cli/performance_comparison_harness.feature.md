# Feature: Ruby / TypeScript 性能比較ハーネス

Ruby から TypeScript へのコマンド移行を進める前に、
同じ入力とコマンドで経過時間やメモリ使用量の悪化を比較できる
ローカルに保存可能な性能比較ハーネスが必要である。

## Scenario: 性能比較ハーネススクリプトが存在する

- Then リポジトリファイル "scripts/compare_ruby_typescript_performance.js" は存在する

## Scenario: 大規模回路の代表的な処理負荷が存在する

- Then リポジトリファイル "test/fixtures/performance/large_add_h_workload.json" は存在する

## Scenario: 性能比較ハーネスは JSON 形式の成果物を出力する

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "writePerformanceComparison" を含む

## Scenario: 性能比較ハーネスはウォームアップと繰り返し実行を扱う

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "warmUp" を含む

## Scenario: 性能比較ハーネスは 20% のしきい値を扱う

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "thresholdRatio" を含む

## Scenario: 性能比較ハーネスは TypeScript 測定で Ruby override を引き継がない

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "withoutRubyOverrideEnvironment" を含む
