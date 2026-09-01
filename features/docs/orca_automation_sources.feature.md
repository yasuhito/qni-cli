# Feature: Orca automation の原本

qni-cli の保守担当者として
Orca automation の設定を履歴から復元できるように
prompt と precheck の原本をリポジトリで管理したい。

## Scenario: issue coordinator の prompt がある

- Then リポジトリファイル "docs/agents/automations/issue-coordinator.md" は存在する

## Scenario: issue coordinator の precheck がある

- Then リポジトリファイル "docs/agents/automations/issue-coordinator.precheck.sh" は存在する

## Scenario: PR reviewer の prompt がある

- Then リポジトリファイル "docs/agents/automations/pr-reviewer.md" は存在する

## Scenario: PR reviewer は読み取り専用レビューで全体チェックを実行しない

- Then リポジトリファイル "docs/agents/automations/pr-reviewer.md" は "テスト、ビルド、全体チェックを実行しない。レビューは差分と契約の照合に限る。" を含む

## Scenario: PR reviewer の precheck がある

- Then リポジトリファイル "docs/agents/automations/pr-reviewer.precheck.sh" は存在する

## Scenario: README は issue coordinator の automation id を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "1c20e813-8150-4f46-a44a-46cea275af4c" を含む

## Scenario: README は PR reviewer の automation id を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "b467ad1d-295a-4146-ab47-b1fe2636ddc3" を含む

## Scenario: README は実行スケジュールを示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "*/10 * * * *" を含む

## Scenario: README は prompt の反映方法を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "--prompt" を含む

## Scenario: README は precheck の反映方法を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "--precheck" を含む

## Scenario: README は automation の有効化方法を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "--enabled" を含む

## Scenario: README は automation の停止方法を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "--disabled" を含む

## Scenario: README は既存 workspace で動く前提を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "/home/yasuhito/Work/qni-cli" を含む

## Scenario: README は coordinator が要求する issue 契約を示す

- Then リポジトリファイル "docs/agents/automations/README.md" は "`## Agent Brief`、`## Acceptance criteria` または `## 受け入れ条件`、`## Out of scope` または `## 対象外` の3項目を必須とする。" を含む
