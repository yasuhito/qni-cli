# Feature: GitHub CI

qni-cli の保守者として
プルリクエストごとに基本チェックを自動実行するために
GitHub Actions と共通の rake 入口を整えたい

## Scenario: rake check は Minitest タスクを定義する

- Then リポジトリファイル "Rakefile" は "Rake::TestTask.new(:test)" を含む

## Scenario: rake check の RuboCop 対象はテストを含む

- Then リポジトリファイル "Rakefile" は "task.patterns = ['Rakefile', 'bin/*', 'features/**/*.rb', 'lib/**/*.rb', 'test/**/*.rb']" を含む

## Scenario: rake check は cucumber-js タスクを含む

- Then リポジトリファイル "Rakefile" は "task check: %i[rubocop flog flay reek typescript cucumber" を含む

## Scenario: rake check は test タスクを含む

- Then リポジトリファイル "Rakefile" は "cucumber test]" を含む

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

## Scenario: GitHub Actions ワークフローは Bundler のパスを作業領域内にする

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle config set path .bundle/vendor" を含む

## Scenario: GitHub Actions ワークフローは Ruby の依存関係を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle install" を含む

## Scenario: GitHub Actions ワークフローは Ruby の依存関係をキャッシュする

- Then リポジトリファイル ".github/workflows/ci.yml" は "actions/cache@v4" を含む

## Scenario: GitHub Actions ワークフローは記号計算用 Python を設定する

- Then リポジトリファイル ".github/workflows/ci.yml" は "scripts/setup_symbolic_python.sh" を含む

## Scenario: GitHub Actions ワークフローは共通チェックを呼ぶ

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle exec rake check" を含む
