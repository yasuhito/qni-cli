# qni benchmark run MVP 利用手順

この文書は、量子回路AIエージェント評価基盤のMVPスモークセットを再現するための手順です。評価ランナーはAIを呼び出しません。人間、Pi、Codex、Claudeなどが同じ条件で `.qni` 提出物を作り、そのファイルを `qni benchmark run` で採点します。

汎用の `qni` コマンド、画像出力、Bloch sphere、状態ベクトル操作の例は [cli.md](cli.md) に置きます。この文書は、ベンチマーク採点と研究試行ログの手順に集中します。

以下の例はリポジトリルートから実行します。開発中の作業ツリーで実行する場合は、先に `npm run build` を実行し、`qni` を `node dist/bin/qni.js` に読み替えてください。

## .qni 提出物の作り方

1. `benchmarks/prompts/qni-solution.md` をAIへの指示として使います。
2. 対象の課題ファイルを選びます。
3. 課題ファイルの frontmatter にある `allowed_commands` と、frontmatter の後ろにある課題本文をプロンプトへ渡します。
4. AIの回答を、そのまま `.qni` ファイルとして保存します。
5. 保存した提出物を `qni benchmark run <task-file> <submission-file>` で評価します。

提出物には回路を作るコマンドだけを書きます。`qni run` や `qni expect` などの検証コマンドは書きません。

## 22問の標準解を実行する

### StateFlip

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

期待される結果は `PASS StateFlip` です。

### BasisChange

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni
```

期待される結果は `PASS BasisChange` です。BasisChange は複数の採点ケースを持ち、既定の `|0>` 入力と `setup_commands` で準備した `|1>` 入力を別々に検証します。

### TwoQubitGate1

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-1.qni
```

期待される結果は `PASS TwoQubitGate1` です。TwoQubitGate1 は CNOT により、1つ目の量子ビットが `|1>` のときに2つ目の量子ビットを反転します。

### TwoQubitGate2

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-2.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-2.qni
```

期待される結果は `PASS TwoQubitGate2` です。TwoQubitGate2 は controlled-Z により、`|11>` 成分だけの符号を反転します。

### TwoQubitGate3

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-3.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-3.qni
```

期待される結果は `PASS TwoQubitGate3` です。TwoQubitGate3 は SWAP により、2つの量子ビットを入れ替えます。

### TwoQubitGate4

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-4.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-4.qni
```

期待される結果は `PASS TwoQubitGate4` です。TwoQubitGate4 は CNOT と X の組み合わせにより、1つ目の量子ビットが `|0>` のときだけ2つ目の量子ビットを反転する変換を作ります。

### ToffoliGate

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/toffoli-gate.md benchmarks/solutions/quantum-katas/basic-gates/toffoli-gate.qni
```

期待される結果は `PASS ToffoliGate` です。ToffoliGate は二重制御 X により、1つ目と2つ目の量子ビットがどちらも `|1>` のときだけ3つ目の量子ビットを反転します。

### BellStateChange1

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-1.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni
```

期待される結果は `PASS BellStateChange1` です。BellStateChange1 は `setup_commands` で `|Φ+>` を準備し、提出物が `|Φ->` に変換することを計算基底の振幅で検証します。

### BellStateChange2

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-2.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni
```

期待される結果は `PASS BellStateChange2` です。BellStateChange2 は `setup_commands` で `|Φ+>` を準備し、提出物が `|Ψ+>` に変換することを計算基底の振幅で検証します。

### BellStateChange3

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni
```

期待される結果は `PASS BellStateChange3` です。BellStateChange3 は `setup_commands` で `|Φ+>` を準備し、提出物が `|Ψ->` に変換することを計算基底の振幅で検証します。

### FredkinGate

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni
```

期待される結果は `PASS FredkinGate` です。FredkinGate は複数の採点ケースを持ち、制御量子ビットが `|0>` の入力と `|1>` の入力を別々に検証します。

### GlobalPhaseChange

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni
```

期待される結果は `PASS GlobalPhaseChange` です。GlobalPhaseChange は、単独では観測不能なグローバル位相を、制御量子ビットの重ね合わせに対する相対位相として採点します。

### SignFlip

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/sign-flip.md benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni
```

期待される結果は `PASS SignFlip` です。SignFlip は複数の採点ケースを持ち、`setup_commands` で準備した `|+>` 入力と `|->` 入力を別々に検証します。

### PhaseFlip

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni
```

期待される結果は `PASS PhaseFlip` です。PhaseFlip は複数の採点ケースを持ち、`setup_commands` で準備した `|0>` 入力と `|1>` 入力を別々に検証します。

### PhaseChangePiOver3

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni
```

期待される結果は `PASS PhaseChangePiOver3` です。PhaseChangePiOver3 は Quantum Katas BasicGates の PhaseChange を固定角度 `pi/3` で評価し、`|0>` 入力と `|1>` 入力を別々に検証します。

### PlusState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni
```

期待される結果は `PASS PlusState` です。

### MinusState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/minus-state.md benchmarks/solutions/quantum-katas/superposition/minus-state.qni
```

期待される結果は `PASS MinusState` です。

### AllBasisVectors_TwoQubits

```bash
qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni
```

期待される結果は `PASS AllBasisVectors_TwoQubits` です。

### AllBasisVectorWithPhaseFlip_TwoQubits

```bash
qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni
```

期待される結果は `PASS AllBasisVectorWithPhaseFlip_TwoQubits` です。

### AllBasisVectorsWithPhases_TwoQubits

```bash
qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni
```

期待される結果は `PASS AllBasisVectorsWithPhases_TwoQubits` です。

### BellState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni
```

期待される結果は `PASS BellState` です。

### GHZState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/ghz-state.md benchmarks/solutions/quantum-katas/superposition/ghz-state.qni
```

期待される結果は `PASS GHZState` です。

## 不正解サンプルを実行する

不正解サンプルは、許可された `qni add` だけを使っていますが、期待される量子状態には到達しません。終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni
```

期待される結果は `FAIL StateFlip` です。

BasisChange には、`|0>` 入力だけに合う不正解サンプルがあります。`|1>` 入力の採点ケースで失敗するため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/incorrect/quantum-katas/basic-gates/basis-change-zero-only.qni
```

期待される結果は `FAIL BasisChange` です。

TwoQubitGate1 には、`|00>` 入力だけに合う不正解サンプルがあります。重ね合わせ入力と `|10>` 入力の採点ケースで失敗するため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md benchmarks/incorrect/quantum-katas/basic-gates/two-qubit-gate-1-zero-only.qni
```

期待される結果は `FAIL TwoQubitGate1` です。

PhaseFlip には、`|0>` 入力だけに合う不正解サンプルがあります。`|1>` 入力の採点ケースで失敗するため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/incorrect/quantum-katas/basic-gates/phase-flip-zero-only.qni
```

期待される結果は `FAIL PhaseFlip` です。

BellStateChange3 には、Bell 状態の符号を取り違える不正解サンプルがあります。`|Ψ->` にすべきところを `|Ψ+>` にするため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/incorrect/quantum-katas/basic-gates/bell-state-change-3-wrong-sign.qni
```

期待される結果は `FAIL BellStateChange3` です。

FredkinGate には、制御量子ビットを無視して常に SWAP する不正解サンプルがあります。制御量子ビットが `|0>` の採点ケースで失敗するため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni
```

期待される結果は `FAIL FredkinGate` です。

GlobalPhaseChange には、グローバル位相を掛けない不正解サンプルがあります。許可された提出物ですが、制御付き効果として期待される相対位相が出ないため、終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-no-phase.qni
```

期待される結果は `FAIL GlobalPhaseChange` です。

## 不許可サンプルを実行する

不許可サンプルは、課題ファイルの `allowed_commands` にない `qni run` を提出物に含みます。終了コードは `2` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni
```

期待される結果は `DISALLOWED StateFlip` です。

## JSON出力を確認する

`--json` を付けると、機械処理向けの結果を標準出力へ出します。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json
```

出力例:

```json
{
  "taskId": "basic-gates/state-flip",
  "title": "StateFlip",
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

## 複数採点ケースを持つ課題を書く

`grading_cases` を使うと、同じ提出物を複数の初期条件で採点できます。各ケースは独立した一時作業ディレクトリで実行されます。`setup_commands` は採点ケースごとの初期状態準備に使い、提出物の `allowed_commands` とは別に評価ランナーが実行します。

BasisChange では、既定の `|0>` 入力と、`qni state set "1|1>"` で準備する `|1>` 入力を分けています。FredkinGate のような3量子ビット課題では、制御量子ビットが `|0>` の入力と `|1>` の入力を別々の採点ケースにします。GlobalPhaseChange では、制御量子ビットを重ね合わせにした2量子ビット状態を `setup_commands` で準備し、制御付きグローバル位相を相対位相として検証します。

```yaml
grading_cases:
  - id: zero-input
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
  - id: one-input
    setup_commands:
      - qni state set "1|1>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
```

## スモークセットを一括実行する

`qni benchmark run-all` を使うと、ベンチマークディレクトリ内の課題をまとめて評価できます。第1引数に課題ディレクトリ、第2引数に対応する提出物ディレクトリを指定します。

```bash
qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas
```

期待される結果は、22問すべてが `passed` になり、終了コードが `0` になることです。

```text
PASS benchmark suite
tasks: 22
passed: 22, failed: 0, disallowed: 0, error: 0
- passed basic-gates/basis-change BasisChange
- passed basic-gates/bell-state-change-1 BellStateChange1
- passed basic-gates/bell-state-change-2 BellStateChange2
- passed basic-gates/bell-state-change-3 BellStateChange3
- passed basic-gates/fredkin-gate FredkinGate
- passed basic-gates/global-phase-change GlobalPhaseChange
- passed basic-gates/phase-change-pi-over-3 PhaseChangePiOver3
- passed basic-gates/phase-flip PhaseFlip
- passed basic-gates/sign-flip SignFlip
- passed basic-gates/state-flip StateFlip
- passed basic-gates/toffoli-gate ToffoliGate
- passed basic-gates/two-qubit-gate-1 TwoQubitGate1
- passed basic-gates/two-qubit-gate-2 TwoQubitGate2
- passed basic-gates/two-qubit-gate-3 TwoQubitGate3
- passed basic-gates/two-qubit-gate-4 TwoQubitGate4
- passed superposition/all-basis-vector-with-phase-flip-two-qubits AllBasisVectorWithPhaseFlip_TwoQubits
- passed superposition/all-basis-vectors-two-qubits AllBasisVectors_TwoQubits
- passed superposition/all-basis-vectors-with-phases-two-qubits AllBasisVectorsWithPhases_TwoQubits
- passed superposition/bell-state BellState
- passed superposition/ghz-state GHZState
- passed superposition/minus-state MinusState
- passed superposition/plus-state PlusState
```

一括実行でも `--json` を付けると、集計と課題ごとの結果を含むJSONを出力します。

```bash
qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas --json
```

## benchmark と research の責務

`benchmark` は提出物を採点し、`research` は研究ログを保存します。`qni benchmark run` と `qni benchmark run-all` は `.qni` 提出物を評価し、結果を標準出力へ出します。`qni research record` は、1つのベンチマークスイートに対する外部共同研究者の1回の研究試行を `research/runs/<timestamp>-<slug>/` に保存します。保存時には `qni benchmark run-all --json` 相当の採点を実行し、その結果も同じ研究試行ディレクトリに残します。

`qni research record` は AI を呼び出さず、git commit も作りません。Pi、Claude、Codex、人間などが外部で作ったプロンプト、AI回答、`.qni` 提出物ディレクトリをファイルパスで渡します。`git commit` が必要な場合は、生成された `research/runs/...` を確認してから手動または上位の実行環境で作ります。

## 研究試行を記録する最小例

プロンプト、AI回答、提出物ディレクトリを用意してから `qni research record` を実行します。次の例では、スモークセットの標準解を外部共同研究者の提出物として扱い、研究試行ディレクトリを作ります。

```bash
mkdir -p tmp/research-example/submissions
cp -R benchmarks/solutions/quantum-katas/. tmp/research-example/submissions/

cat > tmp/research-example/prompt.md <<'MD'
Quantum Katas のスモークセットを `.qni` 形式で解いてください。
MD

cat > tmp/research-example/response.md <<'MD'
提出物ディレクトリに各課題の `.qni` ファイルを保存しました。
MD

qni research record \
  --collaborator claude-sonnet-4 \
  --benchmark benchmarks/quantum-katas \
  --submissions tmp/research-example/submissions \
  --prompt tmp/research-example/prompt.md \
  --response tmp/research-example/response.md \
  --slug smoke-claude
```

成功すると、次のファイル群が `research/runs/<timestamp>-<slug>/` に保存されます。

```text
trial.md
metadata.json
prompt.md
response.md
submissions/
result.json
```

終了コードは採点状態を表します。`passed` は `0`、`failed` は `1`、`disallowed` は `2`、`error` または入力検証や保存の失敗は `3` です。不合格、不許可、実行エラーの研究試行も保存対象です。

## 研究試行レポートを見る

保存済み研究試行を読むには `qni research report` を実行します。対象はリポジトリ内の `research/runs/` です。人間向け出力では、研究試行単位の集計、課題単位の集計、新しい順の研究試行一覧、壊れた研究試行ディレクトリの詳細を英語のプレーンテキストで表示します。

```bash
qni research report
```

研究試行が無い場合も空の集計と `No research trials found.` を表示して終了コード `0` で終了します。無効な研究試行が1件以上ある場合は、読み取れた範囲のレポートを表示して終了コード `1` で終了します。

機械処理には `qni research report --json` を使います。JSON 出力も保存済みの `metadata.json` と `result.json` を読むだけで、再採点や修復は行いません。
