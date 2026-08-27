# Feature: CLI コマンド詳細リファレンス

qni-cli の利用者として
README をプロジェクト全体の入口として読みやすく保つために
CLI コマンドの詳細を専用ドキュメントで確認したい。

## Scenario: CLI リファレンスは存在する

- Then リポジトリファイル "docs/cli.md" は存在する

## Scenario: README は CLI リファレンスへリンクする

- Then リポジトリファイル "README.md" は "[CLI コマンドリファレンス](docs/cli.md)" を含む

## Scenario: CLI リファレンスは add コマンドの回路作成例を示す

- Then リポジトリファイル "docs/cli.md" は "qni add H --qubit 0 --step 0" を含む

## Scenario: CLI リファレンスは名前なし測定の追加例を示す

- Then リポジトリファイル "docs/cli.md" は "qni add Measure --qubit 0 --step 4" を含む

## Scenario: CLI リファレンスは名前付き測定の追加例を示す

- Then リポジトリファイル "docs/cli.md" は "qni add Measure --name input --qubit 0 --step 5" を含む

## Scenario: CLI リファレンスは古典条件付きゲートの追加例を示す

- Then リポジトリファイル "docs/cli.md" は "qni add X --if input --qubit 0 --step 6" を含む

## Scenario: CLI リファレンスは測定回路の1回実行を説明する

- Then リポジトリファイル "docs/cli.md" は "`qni run` は回路を1回実行し" を含む

## Scenario: CLI リファレンスは gate コマンドの読み取り例を示す

- Then リポジトリファイル "docs/cli.md" は "qni gate --qubit 0 --step 0" を含む

## Scenario: CLI リファレンスは rm コマンドの削除例を示す

- Then リポジトリファイル "docs/cli.md" は "qni rm --qubit 0 --step 0" を含む

## Scenario: CLI リファレンスは初期状態管理例を示す

- Then リポジトリファイル "docs/cli.md" は "qni state set \"alpha|0> + beta|1>\"" を含む

## Scenario: CLI リファレンスは状態ベクトル確認例を示す

- Then リポジトリファイル "docs/cli.md" は "qni run --symbolic --basis x" を含む

## Scenario: CLI リファレンスは期待値計算例を示す

- Then リポジトリファイル "docs/cli.md" は "qni expect ZZ XX" を含む

## Scenario: CLI リファレンスは画像出力例を示す

- Then リポジトリファイル "docs/cli.md" は "qni export --state-vector --png --light --output state.png" を含む

## Scenario: CLI リファレンスは Bloch sphere 出力例を示す

- Then リポジトリファイル "docs/cli.md" は "qni bloch --png --trajectory --light --output bloch.png" を含む

## Scenario: CLI リファレンスは benchmark 手順の責務を分ける

- Then リポジトリファイル "docs/cli.md" は "ベンチマーク採点と研究試行ログの詳しい手順は [benchmark.md](benchmark.md) に置きます。" を含む

## Scenario: CLI リファレンスは benchmark 例の実行場所を示す

- Then リポジトリファイル "docs/cli.md" は "次の例は、リポジトリルートから実行します。" を含む

## Scenario: benchmark 文書本体にも責務分離の注記がある

- Then リポジトリファイル "docs/benchmark.md" は "汎用の `qni` コマンド、画像出力、Bloch sphere、状態ベクトル操作の例は [cli.md](cli.md) に置きます。" を含む

## Scenario: README は開発者向け手順へリンクする

- Then リポジトリファイル "README.md" は "[開発者向け手順](docs/development.md)" を含む

## Scenario: 開発者向け手順はパッケージのスモーク検証の置き場所を示す

- Then リポジトリファイル "docs/development.md" は "`npm run smoke:package` は npm パッケージのスモーク検証を実行します。" を含む
