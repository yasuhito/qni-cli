Feature: GitHub CI
  qni-cli の保守者として
  pull request ごとに基本チェックを自動実行するために
  GitHub Actions と共通の rake 入口を整えたい

  Scenario: rake check は Minitest を含む
    Then リポジトリファイル "Rakefile" は "Rake::TestTask.new(:test)" を含む
    And リポジトリファイル "Rakefile" は "task.patterns = ['Rakefile', 'bin/*', 'features/**/*.rb', 'lib/**/*.rb', 'test/**/*.rb']" を含む
    And リポジトリファイル "Rakefile" は "task check: %i[rubocop flog flay reek cucumber cucumber_js test]" を含む

  Scenario: GitHub Actions workflow が共通チェックを呼ぶ
    Then リポジトリファイル ".github/workflows/ci.yml" は存在する
    And リポジトリファイル ".github/workflows/ci.yml" は "push:" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "pull_request:" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "sudo apt-get update" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-base" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "texlive-latex-extra" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "poppler-utils" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "actions/setup-node" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "npm ci" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "scripts/setup_symbolic_python.sh" を含む
    And リポジトリファイル ".github/workflows/ci.yml" は "bundle exec rake check" を含む
