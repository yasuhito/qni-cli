# Feature: 研究試行記録の利用手順

qni-cli の利用者として
外部共同研究者の研究試行を再現できる形で保存するために
研究試行記録の最小手順をドキュメントで確認したい。

## Scenario: ドキュメントは benchmark と research の責務の違いを説明する

- Then リポジトリファイル "docs/benchmark.md" は "`benchmark` は提出物を採点し、`research` は研究ログを保存します。" を含む

## Scenario: ドキュメントは記録前に用意する入力を説明する

- Then リポジトリファイル "docs/benchmark.md" は "プロンプト、AI回答、提出物ディレクトリを用意してから `qni research record` を実行します。" を含む

## Scenario: ドキュメントは研究試行記録のコマンド例を示す

- Then リポジトリファイル "docs/benchmark.md" は "--collaborator claude-sonnet-4" を含む

## Scenario: ドキュメントは AI 呼び出しと git commit を作らないことを説明する

- Then リポジトリファイル "docs/benchmark.md" は "`qni research record` は AI を呼び出さず、git commit も作りません。" を含む
