# Feature: Ruby 基準比較の最終アーカイブ

qni-cli のメンテナとして
Ruby 実装を削除した後も最終互換性確認を参照できるように
削除前に取得した Ruby 実装と TypeScript 実装の代表比較を保存しておきたい

## Scenario: Ruby 比較アーカイブ JSON は保存されている

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.json" は存在する

## Scenario: Ruby 比較アーカイブ概要は保存されている

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.md" は存在する

## Scenario: Ruby 比較アーカイブ概要は全比較の成功を記録する

- Then リポジトリファイル "docs/reports/ruby-comparison-archive.md" は "status: passed" を含む
