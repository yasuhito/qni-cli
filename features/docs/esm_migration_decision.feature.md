# Feature: ESM 移行判断仕様

qni-cli の保守者として
npm CLI としての配布形態を安定させるために
CommonJS 維持と ESM 移行の判断基準をリポジトリ内の仕様で確認したい

## Scenario: 仕様書は存在する

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は存在する

## Scenario: 仕様書は現在の判断を示す

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は "現時点では CommonJS を維持し、ESM への切り替えはまだ実装しない。" を含む

## Scenario: 仕様書は移行のきっかけを示す

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は "ESM 移行を開始できるのは、次の条件がそろったときに限る。" を含む

## Scenario: 仕様書は npm bin contract の試験方針を示す

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は "npm bin contract は `qni` コマンド名、shebang、引数、終了ステータス、標準出力、標準エラー、作業ディレクトリ、環境変数の引き継ぎを対象にする。" を含む

## Scenario: 仕様書は direct node execution の確認方法を示す

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は "direct `node` execution は `node dist/bin/qni.js ...` を使い、npm shim を通さない実行形を確認する。" を含む

## Scenario: 仕様書は installed package execution の確認方法を示す

- Then リポジトリファイル "docs/superpowers/specs/2026-05-06-esm-migration-decision.md" は "installed package execution は `npm pack` で作った tarball を一時プロジェクトに入れ、`node_modules/.bin/qni ...` から確認する。" を含む
