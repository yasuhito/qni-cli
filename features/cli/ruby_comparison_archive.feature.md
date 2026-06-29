# Feature: Ruby 基準比較の最終アーカイブ

qni-cli のメンテナとして
Ruby 実装を削除した後も最終互換性確認を参照できるように
Ruby 実装と TypeScript 実装の代表比較をアーカイブしたい

## Scenario: Ruby 比較アーカイブ script が定義されている

- Then リポジトリファイル "package.json" は "\"archive:ruby-comparison\": \"npm run build && node scripts/archive_ruby_comparison.js\"" を含む

## Scenario: Ruby 比較アーカイブ script は Ruby と TypeScript を比較する

- Then リポジトリファイル "scripts/archive_ruby_comparison.js" は "bundle exec bin/qni" を含む

## Scenario: Ruby 比較アーカイブは JSON と Markdown に保存されている

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.json" は存在する

## Scenario: Ruby 比較アーカイブ概要は存在する

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.md" は存在する

## Scenario: Ruby 比較アーカイブ概要は全比較の成功を記録する

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.md" は "status: passed" を含む
