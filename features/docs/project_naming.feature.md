# Feature: プロジェクト全体の呼称

qni-cli の保守者として
CLI と共同研究者ハーネスの責務を混同しないために
プロジェクト全体の公開呼称と既存名を維持する判断を文書で確認したい。

## Scenario: 命名メモは当面の公開呼称を示す

- Then リポジトリファイル "docs/research/project-naming.md" は "当面の公開呼称は `Qni CoResearcher` とする。" を含む

## Scenario: 命名メモは qni-cli の位置づけを示す

- Then リポジトリファイル "docs/research/project-naming.md" は "`qni-cli` は、量子回路を決定論的に作成・実行・採点・研究ログ化する CLI として残す。" を含む

## Scenario: 命名メモは README 書き換え用の説明を示す

- Then リポジトリファイル "docs/research/project-naming.md" は "Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。" を含む

## Scenario: 命名メモは未実装範囲を実装済みと書かない方針を示す

- Then リポジトリファイル "docs/research/project-naming.md" は "`multi-agent pipeline` や `provider abstraction` を実装済みのように書かない。" を含む

## Scenario: ADR は存在する

- Then リポジトリファイル "docs/adr/0020-use-qni-coresearcher-public-name.md" は存在する

## Scenario: ADR は既存のコマンド名を維持する判断を示す

- Then リポジトリファイル "docs/adr/0020-use-qni-coresearcher-public-name.md" は "`qni` コマンド名は変更しない。" を含む

## Scenario: ADR は npm package 名を維持する判断を示す

- Then リポジトリファイル "docs/adr/0020-use-qni-coresearcher-public-name.md" は "npm package 名 `qni-cli` は変更しない。" を含む

## Scenario: ADR は GitHub repository 名を維持する判断を示す

- Then リポジトリファイル "docs/adr/0020-use-qni-coresearcher-public-name.md" は "GitHub repository 名 `yasuhito/qni-cli` は変更しない。" を含む

## Scenario: 用語集は Qni CoResearcher を定義する

- Then リポジトリファイル "CONTEXT.md" は "**Qni CoResearcher**:" を含む

## Scenario: 用語集は qni-cli を共同研究者全体と区別する

- Then リポジトリファイル "CONTEXT.md" は "_Avoid_: Qni CoResearcher, 共同研究者全体, AI 呼び出し基盤" を含む
