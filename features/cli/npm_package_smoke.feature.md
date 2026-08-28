# Feature: npm パッケージのスモーク検証

qni-cli のメンテナとして
npm パッケージとしての通常経路を確認できるように
`npm pack` で作った成果物をインストールして代表コマンドを実行したい

## Scenario: パッケージのスモーク検証スクリプトが定義されている

- Then リポジトリファイル "package.json" は "\"smoke:package\": \"npm run build && node scripts/smoke_npm_package.js\"" を含む

## Scenario: 初回公開版が定義されている

- Then リポジトリファイル "package.json" は "\"version\": \"0.1.0\"" を含む

## Scenario: npm 公開が許可されている

- Then リポジトリファイル "package.json" は "\"private\": false" を含む

## Scenario: Piパッケージとして識別される

- Then リポジトリファイル "package.json" は "\"pi-package\"" を含む

## Scenario: qni-cliスキルを公開資源として宣言する

- Then リポジトリファイル "package.json" は "\"./skills/qni-cli\"" を含む

## Scenario: パッケージのスモーク検証スクリプトは `npm pack` で作った成果物を使う

- Then リポジトリファイル "scripts/smoke_npm_package.js" は "npm pack" を含む

## Scenario: パッケージのスモーク検証スクリプトはインストール済みの qni を確認する

- Then リポジトリファイル "scripts/smoke_npm_package.js" は "benchmark run" を含む

## Scenario: パッケージのスモーク検証スクリプトは研究試行記録の代表例を確認する

- Then リポジトリファイル "scripts/smoke_npm_package.js" は "qni research record package smoke" を含む

## Scenario: npmパッケージは TypeScriptビルド成果物を含める

- Then リポジトリファイル "package.json" は "\"dist/\"" を含む

## Scenario: npmパッケージは qni-cliスキルを含める

- Then リポジトリファイル "package.json" は "\"skills/\"" を含む

## Scenario: npmパッケージは超密度符号化の例を含める

- Then リポジトリファイル "package.json" は "\"examples/superdense-coding/\"" を含む

## Scenario: MIT License がある

- Then リポジトリファイル "LICENSE" は "MIT License" を含む

## Scenario: Pi からの手動確認手順がある

- Then リポジトリファイル "docs/pi-package.md" は "超密度符号化回路を作り" を含む
