# Feature: Ruby fallback 削除リリース準備

qni-cli のメンテナとして
Ruby fallback を削除するリリースで利用者が混乱しないように
案内文、切り戻し手順、npm リリースサイクル記録を事前に準備したい

## Scenario: Ruby fallback 削除リリース案内が存在する

- Then リポジトリファイル "docs/releases/ruby-fallback-removal.md" は存在する

## Scenario: リリース案内は影響範囲を説明する

- Then リポジトリファイル "docs/releases/ruby-fallback-removal.md" は "Ruby fallback を削除" を含む

## Scenario: リリース案内は非 Ruby 補助境界を説明する

- Then リポジトリファイル "docs/releases/ruby-fallback-removal.md" は "非 Ruby 補助境界" を含む

## Scenario: リリース案内は切り戻し手順を含む

- Then リポジトリファイル "docs/releases/ruby-fallback-removal.md" は "切り戻し手順" を含む

## Scenario: npm リリースサイクル記録が存在する

- Then リポジトリファイル "docs/reports/ruby-fallback-free-release-cycle.md" は存在する

## Scenario: 準備状況棚卸しはリリース準備文書を参照する

- Then リポジトリファイル "docs/reports/ruby-fallback-readiness-audit.md" は "docs/releases/ruby-fallback-removal.md" を含む
