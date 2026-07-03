# Feature: 中立回路 JSON と legacy .qni 提出の利用手順

qni-cli の利用者として
公平比較用の中立回路 JSON と既存の .qni 直接提出を混同しないために
文書で提出プロトコルと評価ランナーの違いを確認したい。

## Scenario: モデル別コストベンチマーク手順は solve の既定プロトコルを示す

- Then リポジトリファイル "docs/model-cost-benchmark.md" は "`qni research solve` の既定の提出プロトコルは `blind-neutral-circuit-json-v1` です。" を含む

## Scenario: ベンチマーク手順は中立 JSON の記録例を示す

- Then リポジトリファイル "docs/benchmark.md" は "--circuit-json-dir tmp/research-example/circuit-json" を含む

## Scenario: ベンチマーク手順は .qni 直接提出を legacy protocol として示す

- Then リポジトリファイル "docs/benchmark.md" は "`.qni` 直接提出は `qni-command-output-v0` の legacy protocol です。" を含む

## Scenario: ベンチマーク手順は blind-neutral と legacy を混ぜない注意を示す

- Then リポジトリファイル "docs/benchmark.md" は "`blind-neutral-circuit-json-v1` の結果と `qni-command-output-v0` の結果を同じ順位表や散布図で混ぜて比較しないでください。" を含む

## Scenario: ベンチマーク手順は submissionProtocol の値を説明する

- Then リポジトリファイル "docs/benchmark.md" は "`submissionProtocol` は `blind-neutral-circuit-json-v1` または `qni-command-output-v0` を保存します。" を含む

## Scenario: README は評価ランナーと研究プロトコルの違いを追える

- Then リポジトリファイル "README.md" は "評価ランナーと研究プロトコルの違いは [ベンチマークと研究試行](docs/benchmark.md) で確認できます。" を含む

## Scenario: .qni 生成用プロンプトは legacy protocol 用であることを示す

- Then リポジトリファイル "benchmarks/prompts/qni-solution.md" は "このプロンプトは `qni-command-output-v0` の legacy protocol 用です。" を含む

## Scenario: 用語集は中立回路 JSON を定義する

- Then リポジトリファイル "CONTEXT.md" は "**中立回路 JSON**:" を含む

## Scenario: ADR は提出プロトコルの分離判断を記録する

- Then リポジトリファイル "docs/adr/0022-separate-neutral-json-and-legacy-qni-protocols.md" は存在する
