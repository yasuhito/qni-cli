# Feature: npm パッケージのスモーク検証

qni-cli のメンテナとして
npm パッケージとしての通常経路を確認できるように
pack した成果物をインストールして代表コマンドを実行したい

## Scenario: package smoke script が定義されている

- Then リポジトリファイル "package.json" は "\"smoke:package\": \"npm run build && node scripts/smoke_npm_package.js\"" を含む

## Scenario: npm pack のための package version が定義されている

- Then リポジトリファイル "package.json" は "\"version\": " を含む

## Scenario: package smoke script は npm pack した成果物を使う

- Then リポジトリファイル "scripts/smoke_npm_package.js" は "npm pack" を含む

## Scenario: package smoke script は installed qni の代表コマンドを確認する

- Then リポジトリファイル "scripts/smoke_npm_package.js" は "benchmark run" を含む

## Scenario: npm package は TypeScript build artifact を含める

- Then リポジトリファイル "package.json" は "\"dist/\"" を含む
