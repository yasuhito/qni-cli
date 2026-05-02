# Feature: TypeScript process compatibility helper

qni-cli のメンテナとして
TypeScript dispatcher から Ruby fallback を安全に呼び出せるようにするために
process compatibility helper の契約を明確にしたい

## Scenario: helper module が存在する

- Then リポジトリファイル "src/process/process_compatibility.ts" は存在する

## Scenario: TypeScript test script が定義されている

- Then リポジトリファイル "package.json" は "\"test:ts\"" を含む

## Scenario: full check は TypeScript tests を実行する

- Then リポジトリファイル "Rakefile" は "npm run test:ts" を含む
