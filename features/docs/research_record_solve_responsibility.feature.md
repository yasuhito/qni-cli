# Feature: research record と solve の責務

qni-cli の保守者として
手動の研究試行記録とモデル実行を伴う上位自動化を混同しないために
両方の責務と保存形式の関係を ADR で確認したい。

## Scenario: ADR は存在する

- Then リポジトリファイル "docs/adr/0021-share-research-trial-directory-between-record-and-solve.md" は存在する

## Scenario: ADR は record が AI を呼ばないことを示す

- Then リポジトリファイル "docs/adr/0021-share-research-trial-directory-between-record-and-solve.md" は "`qni research record` は AI を呼ばない研究試行ログ作成コマンドとする。" を含む

## Scenario: ADR は solve が AI を呼ぶ上位自動化であることを示す

- Then リポジトリファイル "docs/adr/0021-share-research-trial-directory-between-record-and-solve.md" は "`qni research solve` は AI を呼ぶ上位自動化として扱う。" を含む

## Scenario: ADR は共通の研究試行ディレクトリ形式を使うことを示す

- Then リポジトリファイル "docs/adr/0021-share-research-trial-directory-between-record-and-solve.md" は "両方のコマンドは共通の研究試行ディレクトリ形式を使う。" を含む
