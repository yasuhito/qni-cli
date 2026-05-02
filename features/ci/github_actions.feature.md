# Feature: GitHub CI

qni-cli の保守者として
pull request ごとに基本チェックを自動実行するために
GitHub Actions と共通の rake 入口を整えたい

## Scenario: rake check は Minitest task を定義する

- Then リポジトリファイル "Rakefile" は "Rake::TestTask.new(:test)" を含む

## Scenario: rake check の RuboCop 対象はテストを含む

- Then リポジトリファイル "Rakefile" は "task.patterns = ['Rakefile', 'bin/*', 'features/**/*.rb', 'lib/**/*.rb', 'test/**/*.rb']" を含む

## Scenario: rake check は cucumber-js task を含む

- Then リポジトリファイル "Rakefile" は "task check: %i[rubocop flog flay reek cucumber" を含む

## Scenario: rake check は test task を含む

- Then リポジトリファイル "Rakefile" は "cucumber test]" を含む

## Scenario: GitHub Actions workflow は存在する

- Then リポジトリファイル ".github/workflows/ci.yml" は存在する

## Scenario: GitHub Actions workflow は push で実行される

- Then リポジトリファイル ".github/workflows/ci.yml" は "push:" を含む

## Scenario: GitHub Actions workflow は pull request で実行される

- Then リポジトリファイル ".github/workflows/ci.yml" は "pull_request:" を含む

## Scenario: GitHub Actions workflow は apt package list を更新する

- Then リポジトリファイル ".github/workflows/ci.yml" は "sudo apt-get update" を含む

## Scenario: GitHub Actions workflow は LaTeX base を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-base" を含む

## Scenario: GitHub Actions workflow は LaTeX extra を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-extra" を含む

## Scenario: GitHub Actions workflow は poppler を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "poppler-utils" を含む

## Scenario: GitHub Actions workflow は Node.js を設定する

- Then リポジトリファイル ".github/workflows/ci.yml" は "actions/setup-node" を含む

## Scenario: GitHub Actions workflow は Node.js dependencies を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "npm ci" を含む

## Scenario: GitHub Actions workflow は Bundler path を workspace-local にする

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle config set path .bundle/vendor" を含む

## Scenario: GitHub Actions workflow は Ruby dependencies を入れる

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle install" を含む

## Scenario: GitHub Actions workflow は symbolic Python を設定する

- Then リポジトリファイル ".github/workflows/ci.yml" は "scripts/setup_symbolic_python.sh" を含む

## Scenario: GitHub Actions workflow は共通チェックを呼ぶ

- Then リポジトリファイル ".github/workflows/ci.yml" は "bundle exec rake check" を含む
