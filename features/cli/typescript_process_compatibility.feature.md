# Feature: TypeScript プロセス互換性ヘルパー

qni-cli のメンテナとして
TypeScript の実行振り分けから Ruby fallback を安全に呼び出せるようにするために
プロセス互換性ヘルパーの契約を明確にしたい

## Scenario: ヘルパーモジュールが存在する

- Then リポジトリファイル "src/process/process_compatibility.ts" は存在する

## Scenario: TypeScript テストスクリプトが定義されている

- Then リポジトリファイル "package.json" は "\"test:ts\"" を含む

## Scenario: 全体チェックは TypeScript テストを実行する

- Then リポジトリファイル "Rakefile" は "npm run test:ts" を含む

## Scenario: TypeScript のシンボリックヘルパー境界が存在する

- Then リポジトリファイル "src/symbolic_state_renderer.ts" は存在する

## Scenario: TypeScript の run コマンドはシンボリックヘルパー境界を使う

- Then リポジトリファイル "src/commands/run_command.ts" は "renderSymbolicStateVector" を含む
