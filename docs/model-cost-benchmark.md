# モデル別コストベンチマーク利用手順

`qni research solve` で Pi のモデルに量子回路課題を解かせ、得点と料金を研究試行へ保存する手順です。

## 何を測るか

`solve` は道具なしのモデル筆記試験です。`qni research solve` の既定の提出プロトコルは `blind-neutral-circuit-json-v1` です。課題ごとに新しい Pi を空の一時作業場所で起動し、モデルへ次だけを渡します。

- `available_gates`
- frontmatter を除いた課題本文
- `blind-neutral-circuit-json-v1` の出力規則

Pi の道具、セッション、`AGENTS.md`、スキル、拡張機能、プロンプトテンプレートは読み込みません。qni-cli のコマンド、許可コマンド、採点条件、標準解もモデルへ渡しません。道具を使う共同研究者評価や自己修正は別の評価であり、`solve` には含みません。

## 準備

Pi をインストールし、利用するモデルの認証を済ませます。

```bash
pi --version
pi --list-models z-ai/glm-5.3-flash
pi auth check --model z-ai/glm-5.3-flash --json
```

認証情報は Pi が管理します。qni-cli に `research/models.yaml` や API キーを設定しません。研究試行にも秘密情報を保存しません。

## 小さな3問を実行する

```bash
qni research solve \
  --model z-ai/glm-5.3-flash \
  --thinking max \
  --benchmark benchmarks/quantum-katas \
  --task basic-gates/state-flip \
  --task superposition/bell-state \
  --task basic-gates/toffoli-gate \
  --slug glm-5-3-flash-max-smoke
```

`--model` には Pi の正確なモデル ID を指定します。`--thinking` は `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` のいずれかで、実験条件として必須です。`--task` は繰り返し指定できます。省略するとベンチマーク内の全課題を実行します。

実行前に qni-cli は Pi の版、モデルの存在、認証、課題 ID を確認します。準備不足なら終了コード `3` で停止し、研究試行を作りません。

各課題は最大5分待ちます。自動再試行はしません。実験開始後の Pi エラーや時間切れは、その課題を `error` として保存し、残りの課題を続行します。JSON 形式やスキーマが不正な最終回答は `disallowed` です。

## 保存されるもの

```text
research/runs/<timestamp>-<slug>/
├── trial.md
├── metadata.json
├── prompt.md
├── response.md
├── prompts/
├── responses/
├── circuit-json/
├── submissions/
├── calls.json
└── result.json
```

`responses/` には最終回答だけを保存し、モデルの思考途中の本文は保存しません。`metadata.json` と `calls.json` には次を保存します。

- 選択した課題 ID
- Pi の版
- モデル ID とプロバイダー
- 指定した思考量
- input / output / cache read / cache write / total tokens
- Pi が報告した推定料金
- score と採点結果

## score と cost

score は課題単位の合格率です。

```text
score.percent = passed / total * 100
cost.perProblemUsd = totalUsd / total
```

`failed`、`disallowed`、`error` は未合格です。料金は Pi が返した `usage.cost.total` の合計で、実際の請求額を保証しません。

## 同じ課題集合を比較する

3問の試行と22問の試行は公平に比較できません。`compare` と `plot` に、実行時と同じ `--task` を指定します。

```bash
qni research compare \
  --benchmark benchmarks/quantum-katas \
  --task basic-gates/state-flip \
  --task superposition/bell-state \
  --task basic-gates/toffoli-gate

qni research plot \
  --benchmark benchmarks/quantum-katas \
  --task basic-gates/state-flip \
  --task superposition/bell-state \
  --task basic-gates/toffoli-gate \
  --output research/plots/glm-smoke.html
```

`--task` を省略すると、全課題を実行した研究試行だけを対象にします。保存された課題集合が違う研究試行は除外します。`metadata.json` の課題集合と `result.json` の実際の課題IDが一致しない研究試行も、無効として除外します。

## 終了コード

| 終了コード | 意味 |
| ---: | --- |
| 0 | 全課題が `passed` |
| 1 | 1件以上が `failed` |
| 2 | 1件以上が `disallowed`、`error` はなし |
| 3 | 1件以上が `error`、または開始前の入力・Pi準備エラー |

自動テストは偽 Pi を使い、実モデルを呼びません。

## 初期範囲外

- 複数モデルの一括実行
- 複数試行の自動実行
- 自動再試行
- モデルによる自己修正
- Pi に qni-cli やリポジトリの道具を使わせる共同研究者評価
- streaming、tool calling、複数候補生成
