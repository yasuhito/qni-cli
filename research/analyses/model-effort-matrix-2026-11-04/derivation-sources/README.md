# 集計に使った原コードと再導出の条件

ここには測定後に実行した3本の原コードを、バイト列を変えずに保存した。モデルの実行を管理するコードではなく、保存済みファイルを読み、分析用のファイルを作るコードである。モデル呼び出しも再採点も行わない。元の絶対パスと、既存出力を上書きしない `wx` などの保護も残した。通常の保守対象として整形・書き換えない。

| ファイル | 実際に作ったもの |
| --- | --- |
| `assemble-luna-max-once.mjs` | 元の34回答と新しい29回答の出典付き63回答分析、元の34回答の初回採点結果のコピー、Luna の中断記録の公開用コピー |
| `assemble-sonnet-max-once.mjs` | 元の30回答と新しい33回答の出典付き63回答分析、元の30回答の初回採点結果のコピー |
| `collect-final-matrix.mjs` | 23組の試行・中断記録の一覧、21点の一覧、1,325呼び出しの利用量索引、中断時の実行条件のコピー |

`source-index.json` はこの3ファイルの SHA-256 である。上位の `matrix-manifest.json` にある `generatorSha256` は `collect-final-matrix.mjs` のハッシュを指す。図を描く `scripts/plot_model_effort_matrix.js` のハッシュではない。この元の値は変更していない。図の検証コマンドは、3本それぞれのハッシュと、収集コードのハッシュが `generatorSha256` に一致することも検証する。

```bash
node scripts/plot_model_effort_matrix.js --check
```

## 公開記録だけで再生成できる範囲

公開された正式な研究試行、中断記録の公開用コピー、保存済みの初回採点結果、出典付き63回答分析、利用量索引から、表・図・図の JSON は再生成できる。ハッシュ、課題の分割、採点結果、通常の利用量、集計を照合できる。

一方、`calls.json` の通常の利用量項目には独立した `reasoning` 欄がない。`call-usage-index.json` の `reportedReasoning` と分析ファイルの `reasoning` は、生 JSONL の最後の assistant `message_end` にある `usage.reasoning` から抽出した。したがって、reasoning 索引の独立した再導出には非公開の生ログが必要である。公開索引の数字だけを使った再集計はできても、その抽出元まで公開記録だけで確認できるとは主張しない。`--check-raw` は実際の JSONL がある場合だけ、そのハッシュと各利用量の一致も検証する。

Codex の Pi は提供元の内訳欠測も0へ変換する。そのため、生 JSONL があっても、記録の0が実際の思考量0なのかは判別できない。Bridge の欠測は不明のまま扱う。時間切れ2件の全利用量も不明のままであり、このコードの公開によって復元できるわけではない。

## 原コードの再実行に必要な非公開入力

3本の原コードは当時のパスを固定している。完全な再導出には以下の入力を保存時と同じパスで参照できる、隔離した作業領域が必要である。認証情報や OAuth の設定は不要であり、復元対象に含めない。

1. 作業ディレクトリの `research/runs/*-effort-matrix-*`。正式な21試行の保存済み記録をそのまま使う。63課題の通常試行19組と、29課題・33課題の継続試行2組である。
2. Sonnet の公開用中断記録 `research/partials/2026-11-04T053004Z-effort-matrix-v2-claude-bridge-claude-sonnet-5-5-max-600s-aborted`。Sonnet の組み立てコードはこの既存コピーを参照する。Luna の公開用中断記録は Luna のコード自身が作る。
3. 元の中断ディレクトリ `/tmp/qni-research-solve-Rvsq3k` と `/tmp/qni-research-solve-PIFogg`。計画ファイルの全ハッシュを照合するため、公開用コピーから省いた診断も含めて必要である。診断は出力先へコピーしない。
4. `/tmp/qni-model-effort-matrix-evidence/matrix-conditions/` の23組の保存済み入力。`started.json`、`execution-envelope.json`、`validated.json`、`raw-call-index.json`、`raw/*/events.jsonl` を参照する。計1,325呼び出しの生 JSONL は公開していない。
5. 同じ証拠ディレクトリの `LUNA-MAX-CONTINUATION-PLAN.json`、`SONNET-MAX-CONTINUATION-PLAN.json`、`matrix-600-command-candidates.json`、`matrix-3600-command-candidates.json`。元のハッシュ、継続先、参照する保存済み試行を特定する入力であり、モデルの実行には使わない。
6. 同じ場所の `original34-grading-index.json`、`original30-grading-index.json` と、そこから参照する `luna-max-continuation-original34-grading/`、`sonnet-max-original30-grading/` の保存済み初回採点 JSON。再採点して作り直さない。
7. この3本の原コードを同じ証拠ディレクトリへ複製したもの。収集コードは自分の元の絶対パスを使って `generatorSha256` を計算する。

これらの入力を複製し、原本を読み取り専用にした隔離ファイルシステムで、次の順に実行する。既存の証拠ディレクトリや研究記録を出力先にしない。出力先には Luna の中断コピー、両条件の分析・採点コピー、`attempt-envelopes/`、利用量索引、一覧を事前配置しない。証拠ディレクトリ側の `luna-max-derived63-validated.json` と `sonnet-max-derived63-validated.json` も新規出力なので事前配置しない。

```text
assemble-luna-max-once.mjs
assemble-sonnet-max-once.mjs
collect-final-matrix.mjs
```

今回のレビュー対応では、ネットワークを無効にし、認証情報のない環境で、非公開入力の複製からこの3本を実行し直した。既存の `source-artifact-sha256.json` を変更せず、対象5,586ファイルのバイト列一致と1,325生ログの対応を確認した。モデル呼び出し・再採点は0件である。再実行の記録と非公開入力そのものは証拠ディレクトリに保持し、公開していない。
