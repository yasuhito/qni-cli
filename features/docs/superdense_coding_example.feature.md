# Feature: エージェント向け超密度符号化例

qni-cli を使うエージェントとして、短い依頼文、回路を作るコマンド列、
結果の確認手順を再利用したい。

## Scenario: エージェント向けの短い依頼文を再利用できる

- Then リポジトリファイル "examples/superdense-coding/README.md" は "超密度符号化回路を qni-cli で作り" を含む

## Scenario: エージェント向けの確認手順を再利用できる

- Then リポジトリファイル "examples/superdense-coding/README.md" は "qni run --shots 16 --seed 42 --json" を含む

## Scenario: 確認手順は入力と復号結果の比較方法を示す

- Then リポジトリファイル "examples/superdense-coding/README.md" は "`input_high` と `output_high`" を含む

## Scenario: 回路を作るコマンド列を再利用できる

- Then リポジトリファイル "examples/superdense-coding/circuit.qni" は "qni add Z --if input_high --qubit 2 --step 4" を含む
