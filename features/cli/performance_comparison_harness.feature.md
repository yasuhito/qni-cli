# Feature: Ruby / TypeScript performance comparison harness

Ruby から TypeScript へ command migration を進める前に、
同じ input と command で wall-clock / memory regression を比較できる
ローカル保存可能な harness が必要である。

## Scenario: performance comparison harness script が存在する

- Then リポジトリファイル "scripts/compare_ruby_typescript_performance.js" は存在する

## Scenario: representative large-circuit workload が存在する

- Then リポジトリファイル "test/fixtures/performance/large_add_h_workload.json" は存在する

## Scenario: harness は JSON artifact を出力する

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "writePerformanceComparison" を含む

## Scenario: harness は warm-up と repeat を扱う

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "warmUp" を含む

## Scenario: harness は 20% threshold を扱う

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "thresholdRatio" を含む

## Scenario: harness は TypeScript 測定で Ruby override を引き継がない

- Then リポジトリファイル "src/performance/comparison_harness.ts" は "withoutRubyOverrideEnvironment" を含む
