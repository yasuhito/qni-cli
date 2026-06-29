# Feature: GitHub CI

qni-cli の保守者として
プルリクエストごとに基本チェックを自動実行するために
GitHub Actions と Node 通常チェックを整えたい

## Scenario: npm check は TypeScript テストを実行する

- Then リポジトリファイル "package.json" は "npm run test:ts" を含む

## Scenario: npm check は cucumber-js を実行する

- Then リポジトリファイル "package.json" は "npm run cucumber" を含む

## Scenario: npm check は package smoke を実行する

- Then リポジトリファイル "package.json" は "npm run smoke:package" を含む

## Scenario: GitHub Actions ワークフローは存在する

- Then リポジトリファイル ".github/workflows/ci.yml" は存在する

## Scenario: GitHub Actions ワークフローは push で実行される

- Then リポジトリファイル ".github/workflows/ci.yml" は "push:" を含む

## Scenario: GitHub Actions ワークフローはプルリクエストで実行される

- Then リポジトリファイル ".github/workflows/ci.yml" は "pull_request:" を含む

## Scenario: GitHub Actions ワークフローは apt パッケージ一覧を更新する

- Then リポジトリファイル ".github/workflows/ci.yml" は "sudo apt-get update" を含む

## Scenario: GitHub Actions ワークフローは LaTeX の基本パッケージを入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-base" を含む

## Scenario: GitHub Actions ワークフローは LaTeX の追加パッケージを入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-extra" を含む

## Scenario: GitHub Actions ワークフローは poppler を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "poppler-utils" を含む

## Scenario: GitHub Actions ワークフローは Node.js を設定する

- Then リポジトリファイル ".github/workflows/ci.yml" は "actions/setup-node" を含む

## Scenario: GitHub Actions ワークフローは Node.js の依存関係を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "npm ci" を含む

## Scenario: GitHub Actions ワークフローは記号計算用 Python を設定する

- Then リポジトリファイル ".github/workflows/ci.yml" は "scripts/setup_symbolic_python.sh" を含む

## Scenario: GitHub Actions ワークフローは Node 通常チェックを呼ぶ

- Then リポジトリファイル ".github/workflows/ci.yml" は "npm run check" を含む

## Scenario: GitHub Actions ワークフローは Ruby を設定しない

- Then リポジトリファイル ".github/workflows/ci.yml" は "ruby/setup-ruby" を含まない
