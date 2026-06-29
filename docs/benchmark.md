# qni benchmark run MVP 利用手順

この文書は、量子回路AIエージェント評価基盤のMVPスモークセットを再現するための手順です。評価ランナーはAIを呼び出しません。人間、Pi、Codex、Claudeなどが同じ条件で `.qni` 提出物を作り、そのファイルを `qni benchmark run` で採点します。

以下の例はリポジトリルートから実行します。開発中の作業ツリーで実行する場合は `qni` を `bundle exec bin/qni` に読み替えてください。

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
