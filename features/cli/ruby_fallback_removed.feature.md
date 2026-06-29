# Feature: Ruby fallback 削除

qni-cli のメンテナとして
通常の配布物と開発経路から Ruby fallback と Ruby 実行時依存を取り除き
Node.js / TypeScript 経路だけで qni CLI を保守したい

## Scenario: dispatcher は Ruby fallback を呼び出さない

- Then リポジトリファイル "src/dispatcher.ts" は "runRubyFallback" を含まない

## Scenario: process compatibility は Ruby fallback 専用 API を持たない

- Then リポジトリファイル "src/process/process_compatibility.ts" は "RubyFallback" を含まない

## Scenario: package scripts は legacy Ruby check を持たない

- Then リポジトリファイル "package.json" は "check:ruby-legacy" を含まない

## Scenario: package scripts は Ruby 比較 script を持たない

- Then リポジトリファイル "package.json" は "archive:ruby-comparison" を含まない

## Scenario: GitHub Actions は Ruby をセットアップしない

- Then リポジトリファイル ".github/workflows/ci.yml" は "ruby/setup-ruby" を含まない

## Scenario: Gemfile は削除されている

- Then リポジトリファイル "Gemfile" は存在しない

## Scenario: Ruby CLI entrypoint は削除されている

- Then リポジトリファイル "bin/qni" は存在しない

## Scenario: Ruby implementation は削除されている

- Then リポジトリファイル "lib/qni/cli.rb" は存在しない

## Scenario: README は Ruby override を案内しない

- Then リポジトリファイル "README.md" は "QNI_USE_RUBY" を含まない
