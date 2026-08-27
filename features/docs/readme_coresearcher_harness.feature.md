# Feature: README の共同研究者ハーネス説明

Qni CoResearcher の利用者として
qni-cli 単体のコマンド一覧ではなく研究ハーネス全体の入口を理解するために
README でプロジェクト全体の流れと実装済み範囲を確認したい。

## Scenario: README の冒頭は量子回路AI共同研究者ハーネスを説明する

- Then リポジトリファイル "README.md" は "Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。" を含む

## Scenario: README は qni-cli を共同研究者向けの決定論的 CLI と位置づける

- Then リポジトリファイル "README.md" は "`qni-cli` は、共同研究者や外部エージェントホストが使う決定論的な量子回路 CLI です。" を含む

## Scenario: README は評価ランナーと研究プロトコルの提出経路を分ける

- Then リポジトリファイル "README.md" は "Qni CoResearcher には、評価ランナー（`.qni`）と研究プロトコル（`blind-neutral-circuit-json-v1` / `qni-command-output-v0`）の 2 つの提出経路があります。" を含む

## Scenario: README は record と solve の AI 呼び出し範囲を示す

- Then リポジトリファイル "README.md" は "モデル別コストベンチマークで使う `qni research solve` だけは、インストール済みの Pi を課題ごとに道具・セッション・リポジトリ文脈なしで起動し、指定モデルへ回答を求めます。" を含む

## Scenario: README はリポジトリファイルを永続的な研究状態として説明する

- Then リポジトリファイル "README.md" は "研究ログでは、リポジトリファイルを永続的な状態として扱い、会話セッションは一時的な作業文脈として扱います。" を含む

## Scenario: README は PhysicsIntern 風の構想と実装済み範囲を区別する

- Then リポジトリファイル "README.md" は "Qni の現時点の実装済み範囲は qni-cli による決定論的な回路操作、ベンチマーク採点、研究試行の記録、Pi 経由の道具なし単一モデル実行、コスト散布図、レポートです。" を含む

## Scenario: README は制限事項と次の段階を示す

- Then リポジトリファイル "README.md" は "複数モデルの一括実行、複数試行、再試行、自己修正、道具を使う外部エージェント自動実行、既存試行の移行はまだ qni-cli にありません。" を含む

## Scenario: README はセットアップ手順を残す

- Then リポジトリファイル "README.md" は "npm install" を含む

## Scenario: README は検証手順を残す

- Then リポジトリファイル "README.md" は "npm run check" を含む
