# Feature: コミット前のフィードバック

qni-cli の保守者として
コミット前に書式・型・テストの問題を検出して修正できるようにしたい

## Scenario: コミット前フックは存在する

- Then リポジトリファイル ".husky/pre-commit" は存在する

## Scenario: コミット前フックはステージ済みファイルを整形する

- Then リポジトリファイル ".husky/pre-commit" は "npx lint-staged" を含む

## Scenario: コミット前フックは型検査を実行する

- Then リポジトリファイル ".husky/pre-commit" は "npm run typecheck" を含む

## Scenario: コミット前フックは通常チェックを実行する

- Then リポジトリファイル ".husky/pre-commit" は "npm run check" を含む

## Scenario: ステージ済みファイルは Prettier で整形される

- Then リポジトリファイル ".lintstagedrc.json" は "prettier --ignore-unknown --write" を含む
