# Feature: Quantum Katas 移植候補一覧

qni-cli の保守者として
今後のベンチマーク課題化を小さな issue に分けるために
Quantum Katas 由来タスクの移植候補と必要な評価基盤を確認したい。

## Scenario: 移植候補一覧の文書がある

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は存在する

## Scenario: 文書は参照元を明記する

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は "Microsoft Quantum Katas 公式ページ: https://quantum.microsoft.com/en-us/tools/quantum-katas" を含む

## Scenario: 文書は旧 BasicGates の参照元を明記する

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は "旧 `microsoft/QuantumKatas` リポジトリ: `BasicGates/Tasks.qs`" を含む

## Scenario: 文書は Single-Qubit Gates の候補を示す

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は "`State Flip`、`Basis Change`、`Sign Flip`、`Phase Shift Gates`、`Amplitude Change`" を含む

## Scenario: 文書は Preparing Quantum States の候補を示す

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は "`Plus State`、`Minus State`、`All Two-Qubit Basis Vectors`、`Bell State`、`GHZ State`、`W State`" を含む

## Scenario: 文書は移植に必要な評価基盤を分類する

- Then リポジトリファイル "docs/research/quantum-katas-migration-candidates.md" は "分類は「現行評価ランナーで追加可能」「`grading_cases` / `setup_commands` 前提」「追加 qni-cli 機能が必要」の3段階に分ける。" を含む
