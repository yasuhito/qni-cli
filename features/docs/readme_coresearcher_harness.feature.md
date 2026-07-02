# Feature: README の共同研究者ハーネス説明

Qni CoResearcher の利用者として
qni-cli 単体のコマンド一覧ではなく研究ハーネス全体の入口を理解するために
README でプロジェクト全体の流れと実装済み範囲を確認したい。

## Scenario: README の冒頭は量子回路AI共同研究者ハーネスを説明する

- Then リポジトリファイル "README.md" は "Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。" を含む

## Scenario: README は qni-cli を共同研究者向けの決定論的 CLI と位置づける

- Then リポジトリファイル "README.md" は "`qni-cli` は、共同研究者や外部エージェントホストが使う決定論的な量子回路 CLI です。" を含む

## Scenario: README はベンチマーク課題から研究ログまでの流れを示す

- Then リポジトリファイル "README.md" は "ベンチマーク課題 → `.qni` 提出物 → 決定論的な採点 → 研究試行ログとレポート" を含む

## Scenario: README は record と solve の AI 呼び出し範囲を示す

- Then リポジトリファイル "README.md" は "`qni benchmark` と `qni research record` は AI を呼びません。モデル別コストベンチマークで使う `qni research solve` だけは、`research/models.yaml` の登録に従って OpenAI互換 Chat Completions API を直接呼び出します。" を含む

## Scenario: README はリポジトリファイルを永続的な研究状態として説明する

- Then リポジトリファイル "README.md" は "研究ログでは、リポジトリファイルを永続的な状態として扱い、会話セッションは一時的な作業文脈として扱います。" を含む

## Scenario: README は PhysicsIntern 風の構想と実装済み範囲を区別する

- Then リポジトリファイル "README.md" は "PhysicsIntern の `ResearchState` や `multi-agent pipeline` に近い構想はありますが、Qni の現時点の実装済み範囲は qni-cli による決定論的な回路操作、ベンチマーク採点、研究試行の記録、単一モデルの OpenAI互換 API の直接実行、コスト散布図、レポートです。" を含む

## Scenario: README は制限事項と次の段階を示す

- Then リポジトリファイル "README.md" は "複数モデルの一括実行、複数試行、再試行、自己修正、外部エージェント自動実行、既存試行の移行、プロバイダー抽象、作業場所の自動準備はまだ qni-cli にありません。" を含む

## Scenario: README はセットアップ手順を残す

- Then リポジトリファイル "README.md" は "npm install" を含む

## Scenario: README は検証手順を残す

- Then リポジトリファイル "README.md" は "npm run check" を含む
