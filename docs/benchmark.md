# qni benchmark run MVP 利用手順

この文書は、量子回路AIエージェント評価基盤のMVPスモークセットを再現するための手順です。評価ランナーはAIを呼び出しません。人間、Pi、Codex、Claudeなどが同じ条件で `.qni` 提出物を作り、そのファイルを `qni benchmark run` で採点します。

以下の例はリポジトリルートから実行します。開発中の作業ツリーで実行する場合は、先に `npm run build` を実行し、`qni` を `node dist/bin/qni.js` に読み替えてください。

## .qni 提出物の作り方

1. `benchmarks/prompts/qni-solution.md` をAIへの指示として使います。
2. 対象の課題ファイルを選びます。
3. 課題ファイルの frontmatter にある `allowed_commands` と、frontmatter の後ろにある課題本文をプロンプトへ渡します。
4. AIの回答を、そのまま `.qni` ファイルとして保存します。
5. 保存した提出物を `qni benchmark run <task-file> <submission-file>` で評価します。

提出物には回路を作るコマンドだけを書きます。`qni run` や `qni expect` などの検証コマンドは書きません。

## 3問の標準解を実行する

### StateFlip

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

期待される結果は `PASS StateFlip` です。

### PlusState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni
```

期待される結果は `PASS PlusState` です。

### BellState

```bash
qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni
```

期待される結果は `PASS BellState` です。

## 不正解サンプルを実行する

不正解サンプルは、許可された `qni add` だけを使っていますが、期待される量子状態には到達しません。終了コードは `1` です。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni
```

期待される結果は `FAIL StateFlip` です。

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

## スモークセットを一括実行する

`qni benchmark run-all` を使うと、ベンチマークディレクトリ内の課題をまとめて評価できます。第1引数に課題ディレクトリ、第2引数に対応する提出物ディレクトリを指定します。

```bash
qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas
```

期待される結果は、3問すべてが `passed` になり、終了コードが `0` になることです。

```text
PASS benchmark suite
tasks: 3
passed: 3, failed: 0, disallowed: 0, error: 0
- passed basic-gates/state-flip StateFlip
- passed superposition/bell-state BellState
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
