# Quantum Katas 移植候補一覧

この文書は、Microsoft Quantum Katas 由来タスクを qni-cli のベンチマーク課題へ移すための候補一覧です。ここでは課題ファイルや標準解 `.qni` は追加せず、次の issue に分けやすい単位と必要な評価基盤だけを整理します。

## 参照元

- Microsoft Quantum Katas 公式ページ: https://quantum.microsoft.com/en-us/tools/quantum-katas
- 旧 `microsoft/QuantumKatas` リポジトリ: `BasicGates/Tasks.qs` (https://github.com/microsoft/QuantumKatas/blob/main/BasicGates/Tasks.qs)
- 旧 `microsoft/QuantumKatas` リポジトリ: `Superposition/Tasks.qs` (https://github.com/microsoft/QuantumKatas/blob/main/Superposition/Tasks.qs)

公式ページは現行の Microsoft Quantum Katas 体験への入口として扱い、候補名と課題意図は旧 `Tasks.qs` の Q# タスク名とコメントで確認する。

## 分類

分類は「現行評価ランナーで追加可能」「`grading_cases` / `setup_commands` 前提」「追加 qni-cli 機能が必要」の3段階に分ける。

| 分類 | 意味 |
| --- | --- |
| 現行評価ランナーで追加可能 | 1つの固定された初期状態から提出物を実行し、`checks` の状態ベクトルまたは期待値で採点できる。 |
| `grading_cases` / `setup_commands` 前提 | 同じ提出物を複数の初期状態、角度、または検証条件で採点する方が元タスクの意図に近い。 |
| 追加 qni-cli 機能が必要 | `.qni` 提出物または評価ランナーだけでは、可変長入力、分岐、制御付き任意操作、再利用可能な手続きなどを自然に表せない。 |

## Single-Qubit Gates

優先候補は `State Flip`、`Basis Change`、`Sign Flip`、`Phase Shift Gates`、`Amplitude Change` とする。

| 候補 | 旧 `Tasks.qs` の名前 | 分類 | `grading_cases` / `setup_commands` | 追加 qni-cli 機能 | 備考 |
| --- | --- | --- | --- | --- | --- |
| `State Flip` | `StateFlip` | 現行評価ランナーで追加可能 | 不要。完全な Kata 再現では `|0>` と `|1>` などを複数ケース化する余地あり。 | 不要 | `basic-gates/state-flip` はスモーク課題として追加済み。 |
| `Basis Change` | `BasisChange` | `grading_cases` / `setup_commands` 前提 | `|0>` から `|+>`、`|1>` から `|->`、一般状態の写像を分けて採点する。 | 不要 | `H` だけで解けるが、1ケースだけでは基底変換の意図が弱い。 |
| `Sign Flip` | `SignFlip` | `grading_cases` / `setup_commands` 前提 | `|+>` と `|->`、または `α|0> + β|1>` を使う複数ケースが必要。 | 不要 | `Z` による `|1>` 成分の符号反転を確認する。 |
| `Phase Shift Gates` | `PhaseFlip`, `PhaseChange` | `grading_cases` / `setup_commands` 前提 | `S` 相当の固定位相と、角度付き位相を複数角度で採点する。 | 不要 | 公式ページのレッスン名に合わせ、旧タスクでは `PhaseFlip` と `PhaseChange` に対応させる。 |
| `Amplitude Change` | `AmplitudeChange` | `grading_cases` / `setup_commands` 前提 | 複数の角度と `|0>` / `|1>` の写像を分けて採点する。 | 原則不要 | 記号角そのものを採点したい場合は、別 issue で角度式の扱いを確認する。 |

## Preparing Quantum States

優先候補は `Plus State`、`Minus State`、`All Two-Qubit Basis Vectors`、`Bell State`、`GHZ State`、`W State` とする。

| 候補 | 旧 `Tasks.qs` の名前 | 分類 | `grading_cases` / `setup_commands` | 追加 qni-cli 機能 | 備考 |
| --- | --- | --- | --- | --- | --- |
| `Plus State` | `PlusState` | 現行評価ランナーで追加可能 | 不要 | 不要 | `superposition/plus-state` はスモーク課題として追加済み。 |
| `Minus State` | `MinusState` | 現行評価ランナーで追加可能 | 不要 | 不要 | `superposition/minus-state` はスモーク課題として追加済み。 |
| `All Two-Qubit Basis Vectors` | `AllBasisVectors_TwoQubits` | 現行評価ランナーで追加可能 | 不要 | 不要 | `superposition/all-basis-vectors-two-qubits` はスモーク課題として追加済み。 |
| `Bell State` | `BellState` | 現行評価ランナーで追加可能 | 不要 | 不要 | `superposition/bell-state` はスモーク課題として追加済み。 |
| `All Bell States` | `AllBellStates` | `grading_cases` / `setup_commands` 前提 | 4つの Bell 状態を別ケースまたは別課題に分ける。 | `index` 付き1課題として扱うなら必要 | 最初は4つの固定課題に分ける方が qni-cli の提出形式に合う。 |
| `GHZ State` | `GHZ_State` | 現行評価ランナーで追加可能 | 固定した N ごとの課題なら不要。複数 N を1課題にまとめるなら必要。 | 一般 N の1課題化には必要 | まず N = 3 の固定課題として切ると小さい。 |
| `W State` | `WState_PowerOfTwo`, `WState_Arbitrary` | 追加 qni-cli 機能が必要 | 固定 N の検証ケースは作れるが、元タスクの可変長性は表しにくい。 | 必要 | 制御付き回転、可変長の回路生成、または手続き的な提出形式を検討してから移植する。 |

## 次に切り出しやすい issue

1. `Basis Change`、`Sign Flip`、`Phase Shift Gates`、`Amplitude Change` を `grading_cases` / `setup_commands` 前提の小さなベンチマーク課題として追加する。
2. `All Bell States` を4つの固定 Bell 状態課題へ分けて追加する。
3. `GHZ State` を N = 3 の固定課題として追加し、一般 N 化は別 issue に分ける。
4. `W State` は qni-cli の追加機能を先に設計してから課題化する。
