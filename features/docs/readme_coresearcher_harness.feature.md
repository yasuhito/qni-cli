# Feature: README を Qni CoResearcher の利用者向け入口にする

量子回路・量子情報の研究者として
Qni CoResearcher の目的、現在地、試し方をすぐ理解するために
README で利用者から見える全体像を確認したい。

## Scenario: 公開タイトルは Qni CoResearcher である

- Then リポジトリファイル "README.md" の最初の行は "# Qni CoResearcher" である

## Scenario: 冒頭は共同研究の全体像を説明する

- Then リポジトリファイル "README.md" は "AI共同研究者と量子回路を設計し、実行結果を検証し、図と文章で説明し、その過程を後から確認できる形で残す" を含む

## Scenario: qni-cli の役割をプロジェクト全体と区別する

- Then リポジトリファイル "README.md" は "`qni-cli` は、その共同研究を支えるエージェント向けの決定論的な量子回路 CLI です。" を含む

## Scenario: Pi の標準コマンドで導入できる

- Then リポジトリファイル "README.md" は "pi install npm:qni-cli" を含む

## Scenario: 最初の依頼は超密度符号化を扱う

- Then リポジトリファイル "README.md" は "超密度符号化回路を qni-cli で作り" を含む

## Scenario: qni-cli で生成した回路図を掲載する

- Then リポジトリファイル "README.md" は "`qni view` の出力" を含む

## Scenario: qni-cli で生成した測定結果を掲載する

- Then リポジトリファイル "README.md" は "input_high | input_low | output_high | output_low | count" を含む

## Scenario: ロードマップは利用可能を示す

- Then リポジトリファイル "README.md" は "| 利用可能 |" を含む

## Scenario: ロードマップは整備中を示す

- Then リポジトリファイル "README.md" は "| 整備中 |" を含む

## Scenario: ロードマップは構想を示す

- Then リポジトリファイル "README.md" は "| 構想 |" を含む

## Scenario: Pi のインライン表示は整備中である

- Then リポジトリファイル "README.md" は "Pi 上で回路図や数式を自然にインライン表示する" を含む

## Scenario: 研究ノートブックとの接続は構想である

- Then リポジトリファイル "README.md" は "Jupyter・marimo の編集とノートブック内での対話" を含む

## Scenario: 研究分担は構想である

- Then リポジトリファイル "README.md" は "複数エージェント・複数スキルによる研究分担" を含む

## Scenario: 現在使える回路操作が分かる

- Then リポジトリファイル "README.md" は "回路を作成・編集し、状態ベクトル、測定値、複数ショットの分布を実行結果として得る" を含む

## Scenario: 現在使える採点と研究試行が分かる

- Then リポジトリファイル "README.md" は "ベンチマーク提出物を検証・採点し、研究試行を記録・比較する" を含む

## Scenario: CLI を npm から直接導入できる

- Then リポジトリファイル "README.md" は "npm install --global qni-cli" を含む

## Scenario: PhysicsIntern の研究文書へ案内する

- Then リポジトリファイル "README.md" は "[PhysicsIntern 実装確認メモ](docs/research/physics-intern-implementation-notes.md)" を含む

## Scenario: 公開名の研究文書へ案内する

- Then リポジトリファイル "README.md" は "[プロジェクト命名メモ](docs/research/project-naming.md)" を含む

## Scenario: 開発者向け文書へ案内する

- Then リポジトリファイル "README.md" は "[開発者向け手順](docs/development.md)" を含む

## Scenario: MIT ライセンスを案内する

- Then リポジトリファイル "README.md" は "[MIT License](LICENSE)" を含む

## Scenario: 開発への参加方法を案内する

- Then リポジトリファイル "README.md" は "Issue と Pull Request を歓迎します" を含む
