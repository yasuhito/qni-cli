# 量子回路AIエージェント評価基盤 PRD

## 概要

本PRDは、AIエージェントが自然言語の課題文から `qni` コマンド列を生成し、`qni-cli` による決定論的な検証で量子回路としての正誤を自動判定する、最小の評価基盤を定義する。最初から大規模なマルチエージェント研究支援基盤を作るのではなく、まず「課題文 → `.qni` 提出物 → 一時ディレクトリで実行 → `qni run` / `qni expect` で検証 → 合否判定 → JSON出力」までをエンドツーエンドで通す。以後は、この動く評価ループを保ちながら、評価対象、検証能力、公開研究ログ、外部ベンチマーク連携を段階的に拡張する。

## 背景

本プロジェクトは、理論物理一般ではなく、量子コンピューティング、特に量子回路設計の研究開発支援を対象とする。AIエージェントには、課題文を読み、回路設計方針を考え、`qni` コマンド列として解答回路を構築する役割を担わせる。一方で、状態ベクトル計算、期待値計算、検証、成否判定などの決定論的な処理は `qni-cli` に任せる。これにより、AIが誤りやすい厳密計算をCLI側で固定し、AIの強みである探索、推論、設計判断を活かす。

最初の評価対象には、Microsoft Quantum Katas 由来の小さな量子回路課題を用いる。既存の Cucumber feature や元の Q# タスクを直接評価入力にするのではなく、本プロジェクト用に Markdown + YAML frontmatter 形式の短いベンチマーク課題ファイルを作成する。将来的にベンチマークが大規模化し、それ自体が成果物として独立できる段階になった場合は、別リポジトリへの分離を検討する。

## 目的

- AIエージェントが生成した `qni` コマンド列を、安全かつ再現可能に評価する。
- 量子回路としての正誤を、CLIによる決定論的な検証で自動判定する。
- 最初の小さなスモークセットを通じて、単一量子ビット、重ね合わせ、エンタングルメントを含む最小評価ループを確立する。
- 将来のAIエージェント比較、公開研究ログ、外部ベンチマーク移植に使える構造化出力を用意する。

## 非目標

- MVPでは、評価ランナーがAIモデルやAIエージェントを直接呼び出さない。
- MVPでは、GitHub Pages用のMarkdownレポート生成は行わない。
- MVPでは、ゲート数、深さ、補助量子ビット数などの品質指標は採点しない。
- MVPでは、AI自身に検証コマンドを書かせない。
- MVPでは、QuanBench、QCircuitBench、Qiskit HumanEval などの外部ベンチマーク移植は行わない。
- MVPでは、マルチエージェントによるレビュー、批評、自己修正ループは実装しない。

## ユーザー

- 量子回路設計支援AIエージェントを開発・評価する研究者または開発者。
- `qni-cli` を使って量子回路課題の正誤を確認したい開発者。
- AIモデルやAIエージェントが生成した量子回路解答を同じ条件で比較したい評価者。

## MVPの成功条件

MVPは、次を満たしたとき成功とする。

1. `StateFlip`, `PlusState`, `BellState` の3問のスモークセットをベンチマーク課題として用意できる。
2. 各課題の標準解 `.qni` を `qni benchmark run` で評価し、すべて合格判定にできる。
3. 少なくとも1つの不正解提出を、不合格として判定できる。
4. 少なくとも1つの不許可コマンド提出を、仕様違反として拒否できる。
5. 通常の人間向けテキスト出力に加えて、`--json` で機械処理向けのJSON結果を出力できる。
6. 評価実行は課題ごとの一時ディレクトリで行われ、開発中の作業ディレクトリを汚染しない。

## ディレクトリ構成

MVPでは、以下の構成を採用する。

```text
benchmarks/
  quantum-katas/
    basic-gates/
      state-flip.md
    superposition/
      plus-state.md
      bell-state.md
  solutions/
    quantum-katas/
      basic-gates/
        state-flip.qni
      superposition/
        plus-state.qni
        bell-state.qni
  incorrect/
    quantum-katas/
      basic-gates/
        state-flip-wrong.qni
  disallowed/
    quantum-katas/
      basic-gates/
        state-flip-disallowed.qni
  prompts/
    qni-solution.md
```

- `benchmarks/quantum-katas/` は評価対象の課題ファイルを置く。
- `benchmarks/solutions/` は標準解を置く。課題ファイルとは分離し、AIに見せる入力と答えが同居しないようにする。
- `benchmarks/incorrect/` は、許可された操作だが量子回路として誤っている提出物を置く。
- `benchmarks/disallowed/` は、安全性または仕様に反する提出物を置く。
- `benchmarks/prompts/` は、AIに `.qni` 提出物を生成させるための最小プロンプトテンプレートを置く。

## ベンチマーク課題ファイル形式

課題ファイルは Markdown + YAML frontmatter とする。AIエージェントには本文の自然文を読ませ、評価ランナーには frontmatter の構造化情報を読ませる。

MVPで frontmatter に含める項目は次のとおり。

- `id`
- `title`
- `source`
- `difficulty`
- `allowed_commands`
- `checks`

例:

```markdown
---
id: basic-gates/state-flip
title: State Flip
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add
checks:
  tolerance: 1e-9
  items:
    - type: run
      expected:
        - basis: "|1>"
          amplitude:
            real: 1
            imaginary: 0
---

1量子ビットを `|0>` から `|1>` に反転する量子回路を、`qni` コマンド列として作成してください。
```

`reference_solution` は、評価時に隠すべき情報であるため、課題ファイルには含めない。`setup` や `tags` はMVPでは必須にせず、必要になった段階で追加する。

## 提出物形式

AIエージェントまたは人間の提出物は、1行1コマンドの `.qni` テキストファイルとする。各行は、実際のCLIと同じ完全なコマンドを書く。

例:

```text
qni add X --qubit 0 --step 0
```

提出物には検証コマンドを書かせない。検証は課題ファイルの `checks` によって固定する。これにより、誤った検証コマンドで正解に見せる余地をなくす。

素の shell script は任意コマンド実行につながるため採用しない。評価ランナーは `.qni` ファイルを読み、課題ファイルの `allowed_commands` で許可された `qni` サブコマンドだけを実行する。

## CLI仕様

MVPでは、次のコマンドを追加する。

```bash
qni benchmark run <task-file> <submission-file>
qni benchmark run <task-file> <submission-file> --json
```

- `<task-file>` は Markdown + YAML frontmatter 形式のベンチマーク課題ファイル。
- `<submission-file>` は `.qni` 提出物ファイル。
- 評価ランナーは課題ごとに一時ディレクトリを作り、その中で提出コマンドを実行する。
- 提出コマンドの実行後、課題ファイルの `checks` に従って `qni run` または `qni expect` を実行し、期待結果と比較する。
- 通常は人間向けテキストを標準出力へ出す。
- `--json` 指定時は、機械処理向けJSONを出力する。

## 検証仕様

MVPでは、`checks` の種類として次の2つをサポートする。

1. `run`: `qni run` による状態ベクトル比較。
2. `expect`: `qni expect` による期待値比較。

数値比較は、課題ファイルごとに `tolerance` を指定できるようにする。初期値は `1e-9` を想定するが、ランナーに固定値として埋め込まない。

## 終了コード

`qni benchmark run` は、CIや自動集計で使えるように終了コードで結果種別を区別する。

| 終了コード | 意味 |
|---:|---|
| 0 | 合格 |
| 1 | 不合格。提出物は実行できたが、量子回路として期待結果と一致しない。 |
| 2 | 不許可。提出物に許可されていないコマンドが含まれる。 |
| 3 | 実行エラー。課題ファイル不正、提出物の構文不正、`qni` 実行失敗など。 |

## JSON出力

`--json` では、少なくとも次の情報を含める。

```json
{
  "taskId": "basic-gates/state-flip",
  "title": "State Flip",
  "submission": "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
  "status": "passed",
  "exitCode": 0,
  "checks": [
    {
      "type": "run",
      "status": "passed"
    }
  ]
}
```

`status` は、MVPでは `passed`, `failed`, `disallowed`, `error` のいずれかとする。

## 最初のスモークセット

MVPでは、次の3問を用意する。

### `basic-gates/state-flip`

- 目的: `|0>` を `|1>` に反転する。
- 主な能力: 単一量子ビットの基本ゲート操作。
- 代表解: `qni add X --qubit 0 --step 0`

### `superposition/plus-state`

- 目的: `|0>` から `|+>` を作る。
- 主な能力: Hadamard ゲートによる重ね合わせ状態の生成。
- 代表解: `qni add H --qubit 0 --step 0`

### `superposition/bell-state`

- 目的: 2量子ビットの Bell 状態を作る。
- 主な能力: 重ね合わせと制御付きゲートによるエンタングルメント生成。
- 代表解:

```text
qni add H --qubit 0 --step 0
qni add X --control 0 --qubit 1 --step 1
```

## 実装方針

MVPの実装言語は TypeScript / Node.js とする。評価基盤は Markdown + YAML frontmatter、JSON結果出力、GitHub Pages連携、外部ベンチマーク連携へ広げる可能性があるため、TypeScript / Node.js で実装する。

新しいCLI機能を追加する前に、まず `features/cli/benchmark_run.feature.md` を追加し、`qni benchmark run` の振る舞いを Cucumber で定義する。

最初の feature には、次を含める。

1. 合格ケース。
2. 失敗ケース。
3. `--json` 出力ケース。
4. 許可されていないコマンドの拒否ケース。

## 実装順序

PRD後の実装は、次の順序で進める。

1. `features/cli/benchmark_run.feature.md` を追加する。
2. スモークセット3問の課題ファイルを追加する。
3. 標準解、不正解サンプル、不許可サンプル、プロンプトテンプレートを追加する。
4. Markdown + YAML frontmatter parser を実装する。
5. `.qni` 提出物を読み、安全に許可コマンドだけを実行する仕組みを実装する。
6. `run` / `expect` の checks を実装する。
7. 人間向けテキスト出力と `--json` 出力を実装する。

## issue分割案

PRD作成後は、次のような技術要素ごとに issue を分割する。

1. `qni benchmark run` の feature を追加する。
2. Quantum Katas 由来のスモークセット課題ファイルを追加する。
3. `.qni` 標準解・不正解・不許可サンプルを追加する。
4. ベンチマーク課題ファイルの frontmatter 読み取りを実装する。
5. `.qni` 提出物の安全な実行を実装する。
6. `run` / `expect` checks を実装する。
7. `qni benchmark run` の人間向け出力と `--json` 出力を実装する。

## 将来拡張

MVP後に、次の拡張を検討する。

- 複数課題を一括実行する `qni benchmark run-all`。
- ゲート数、深さ、補助量子ビット数などの品質指標。
- GitHub Pages向けのMarkdownレポート生成。
- 公開研究ログとの連携。
- AIエージェントによる自己修正ループ。
- 複数モデルや複数エージェントの比較実験。
- QuanBench の状態準備・ゲート分解タスクの移植。
- Qiskit HumanEval、QCircuitBench、QASMBench、MQT Bench への段階的拡張。
- ベンチマーク自体が大規模化した場合の別リポジトリ分離。
