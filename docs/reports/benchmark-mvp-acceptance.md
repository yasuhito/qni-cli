# 量子回路AIエージェント評価基盤 MVP受け入れ確認

実施日: 2026-06-29

## 対象

PRD: `docs/prd/quantum-circuit-agent-benchmark.md`

確認対象は、`qni benchmark run` による最小評価ループである。

## 全体チェック

```bash
bundle exec rake check
```

結果: 成功

- RuboCop: 121 files inspected, no offenses detected
- TypeScript tests: 129 tests passed
- Cucumber: 602 scenarios passed, 1597 steps passed
- Ruby tests: 65 runs, 185 assertions, 0 failures

## MVP成功条件の確認

### 1. 3問のスモークセットを用意できる

確認済み。

- `benchmarks/quantum-katas/basic-gates/state-flip.md`
- `benchmarks/quantum-katas/superposition/plus-state.md`
- `benchmarks/quantum-katas/superposition/bell-state.md`

### 2. 各課題の標準解 `.qni` を合格判定にできる

```bash
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni
```

結果: すべて成功、終了コード `0`

### 3. 不正解提出を不合格にできる

```bash
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni
```

結果: `FAIL StateFlip`、終了コード `1`

### 4. 不許可コマンド提出を拒否できる

```bash
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni
```

結果: `DISALLOWED StateFlip`、終了コード `2`

### 5. 実行エラーを区別できる

```bash
node dist/bin/qni.js benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-missing-allowed-commands.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

結果: `ERROR benchmark run`、終了コード `3`

### 6. `--json` で機械処理向けJSONを出力できる

確認済み。

| ケース | 終了コード | JSON `status` | JSON `exitCode` |
|---|---:|---|---:|
| 合格 | 0 | `passed` | 0 |
| 不合格 | 1 | `failed` | 1 |
| 不許可 | 2 | `disallowed` | 2 |
| 実行エラー | 3 | `error` | 3 |

合格ケースのJSON例:

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

### 7. 評価実行が作業ディレクトリを汚染しない

`qni benchmark run` は一時ディレクトリで提出コマンドを実行する。MVPの全体チェックと手動確認後、作業ディレクトリに評価由来の `circuit.json` は残っていない。

## 判定

MVP成功条件は満たされた。

次の自然な開発段階は、1課題ずつの評価を複数課題の評価へ広げる `qni benchmark run-all` である。
