# Feature: ESM 移行判断 ADR

qni-cli の保守者として
npm CLI としての配布形態を安定させるために
CommonJS 維持と ESM 移行の判断基準をリポジトリ内の ADR で確認したい

## Scenario: ADR は存在する

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は存在する

## Scenario: ADR は現在の判断を示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "現時点では CommonJS を維持し、ESM への切り替えはまだ実装しない。" を含む

## Scenario: ADR は移行のきっかけを示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "ESM 移行を開始できるのは、次の条件がそろったときに限る。" を含む

## Scenario: ADR は npm bin の契約の試験方針を示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "npm bin の契約は `qni` コマンド名、shebang、引数、終了ステータス、標準出力、標準エラー、作業ディレクトリ、環境変数の引き継ぎを対象にする。" を含む

## Scenario: ADR は互換性確認手順を示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "## 互換性確認手順" を含む

## Scenario: ADR は直接 node 実行の確認方法を示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "直接 `node` 実行は `node dist/bin/qni.js ...` を使い、npm shim を通さない実行形を確認する。" を含む

## Scenario: ADR はインストール済みパッケージでの実行確認方法を示す

- Then リポジトリファイル "docs/adr/0001-keep-commonjs-until-esm-is-justified.md" は "インストール済みパッケージでの実行は `npm pack` で作った tarball を一時プロジェクトに入れ、`node_modules/.bin/qni ...` から確認する。" を含む
