# Feature: QNI_USE_RUBY operational documentation

qni-cli の保守者として
TypeScript 段階移行中の緊急 rollback と release difference analysis を安全に行うために
Ruby 実装を強制する環境変数の使い方とリスクを README で確認したい

## Scenario: README は QNI_USE_RUBY の目的を説明する

- Then リポジトリファイル "README.md" は "`QNI_USE_RUBY=1` is an operational override for the TypeScript migration period." を含む

## Scenario: README は QNI_USE_RUBY の効果を説明する

- Then リポジトリファイル "README.md" は "When it is set, the dispatcher must bypass TypeScript routing and execute the Ruby fallback path for every `qni` command." を含む

## Scenario: README は QNI_USE_RUBY の利用例を示す

- Then リポジトリファイル "README.md" は "QNI_USE_RUBY=1 qni run --symbolic" を含む

## Scenario: README は compatibility lane の注意を説明する

- Then リポジトリファイル "README.md" は "The TypeScript compatibility lane in CI must fail fast if `QNI_USE_RUBY` is set." を含む

## Scenario: README は Ruby fallback removal まで文書を残す方針を説明する

- Then リポジトリファイル "README.md" は "Keep this section until the final Ruby fallback removal issue deletes the dispatcher fallback and Ruby runtime dependency." を含む
