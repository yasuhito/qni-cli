# モデル別コストベンチマーク利用手順

`qni research solve` で Pi のモデルに量子回路課題を解かせ、得点と料金を研究試行へ保存する手順です。

## 何を測るか

`solve` は道具なしのモデル筆記試験です。`qni research solve` の既定の提出プロトコルは `blind-neutral-circuit-json-v1` です。課題ごとに新しい Pi を空の一時作業場所で起動し、モデルへ次だけを渡します。

- `available_gates`
- frontmatter を除いた課題本文
- `blind-neutral-circuit-json-v1` の出力規則

Pi の道具、セッション、`AGENTS.md`、スキル、拡張機能、プロンプトテンプレートは読み込みません。qni-cli のコマンド、許可コマンド、採点条件、標準解もモデルへ渡しません。道具を使う共同研究者評価や自己修正は別の評価であり、`solve` には含みません。

既存7状態準備課題は `up_to_global_phase: true` により共通のグローバル位相を無視します。basic-gates と single-qubit-gates は厳密比較のままです。この7課題は過去の評価時点から比較条件が変わっているため、変更前後の score を同一条件として単純比較しないでください。過去の研究試行は再採点・書き換えしません ([ADR 0019](adr/0019-research-report-does-not-regrade.md))。対象課題と仕様は [benchmark の説明](benchmark.md#状態準備のグローバル位相)、判断の背景は [ADR 0026](adr/0026-opt-in-to-global-phase-insensitive-state-checks.md) を参照してください。

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

`--model` には Pi の正確なモデル ID を指定します。`--model` と `--thinking` は両方必須です。`--thinking` は `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` のいずれかです。`--task` は繰り返し指定できます。省略するとベンチマーク内の全課題を実行します。

実行前に qni-cli は Pi の版、モデルの存在、認証、課題 ID を確認します。準備不足なら終了コード `3` で停止し、研究試行を作りません。

各課題は最大1時間 (3,600秒) 待ちます。無期限には待ちません。新しい研究試行では、この上限を `metadata.json` の `harness.piTaskTimeoutMs` に `3600000` として保存します。以前の300秒・600秒上限で保存した研究試行や中断記録は変更しません。課題ごとの自作ディレクトリだけを `--approve` で承認し、`.pi/settings.json` にエージェントとプロバイダー両方の再試行無効化、SSE、キャッシュ保温無効化、自動要約無効化を指定します。`--offline` で実行途中のモデルカタログ更新も止めます。利用者のグローバル設定は変更しません。

Pi の実行エラー、時間切れ、応答プロバイダー・モデルの不一致、不正な JSONL では、最初の1件で後続の呼び出しを止め、終了コード `3` で終了します。`stopReason` が `error` や `aborted` の応答は、説明文があっても回路回答として採点しません。

この場合は正式な研究試行を作らず、標準エラーの `Partial research solve artifacts: <path>` に示した一時ディレクトリに部分記録を残します。`calls.json` の `executionStatus` は `aborted`、`taskSelection` と `calls` は実際に試みた課題だけ、`plannedTaskSelection` は当初の課題集合です。未実行課題を合成しません。エラー応答にも利用量があれば保持します。異なるモデル・プロバイダーの応答も、実際の応答元と利用量を残しますが、解答としては受け付けません。応答を得られない場合や、利用量の項目が欠けたり不正だったりする場合、その項目は `null` にします。欠測を0で埋めません。Pi 自体がエラー時に返す初期値の0も、実際の消費量が0である保証にはなりません。部分記録は完成した63課題の比較には使えません。自動再開や再試行はしません。

Pi の非ゼロ終了では、標準出力・標準エラーの末尾を各64 KiB以内に制限した診断を、部分記録の `diagnostic` が指す非公開ファイル (権限 `0600`) に保存します。生の標準エラーをコマンドの標準エラーへ転記しません。準備確認の失敗も、`Pi preflight failed; private diagnostic: <path>` に示す非公開ファイルへ保存します。診断には機密情報が含まれる可能性があるため、公開しないでください。非ゼロ終了前に最終応答を得ていれば、その利用量も保持します。時間切れとするのは `ETIMEDOUT` が報告された場合だけであり、外部の SIGTERM とは区別します。

正常に返った回答の JSON 形式やスキーマが不正なら `disallowed` です。この場合や採点上の `failed` では残りの課題を続行し、従来どおり研究試行を保存します。過去の研究試行は変更しません。

## プロバイダーを固定する

`--provider` を付けると、Pi のプロバイダーとモデル ID の両方が完全一致する行だけを使います。省略した場合も、事前確認で選んだプロバイダーを課題ごとの呼び出しに明示します。同じモデル ID を持つ別プロバイダーへは切り替えません。課題ごとの応答のプロバイダーとモデルが指定と違えば、部分記録に `error` を残して停止します。

## Claude Bridge で実行する

Claude Code のサブスクリプションで動く [pi-claude-bridge](https://github.com/elidickinson/pi-claude-bridge) のモデルは、拡張機能ファイルを明示して実行します。

```bash
qni research solve \
  --provider claude-bridge \
  --model claude-opus-5-5 \
  --claude-bridge-extension <pi-claude-bridge>/src/index.ts \
  --thinking high \
  --benchmark benchmarks/quantum-katas \
  --task basic-gates/state-flip \
  --slug claude-bridge-opus-5-5-high-smoke
```

`--claude-bridge-extension` には `--provider claude-bridge` が必要です。Pi は `--no-extensions` のまま、指定した拡張機能だけを `-e` で読み込みます。課題ごとの空の作業場所に `.pi/claude-bridge.json` として `{"provider":{"settingSources":[]}}` を置き、Claude Code の子プロセスが利用者の `~/.claude` の設定、フック、プラグイン、言語設定を読まないようにします。

ブリッジは `provider.settingSources` に対応し、不正な値を拒否する版が必要です。実行前の確認で、正しい設定ではモデルが登録され、不正な設定では登録されないことを確かめます。対応していないブリッジでは、モデルを呼ぶ前に終了コード `3` で停止します。Pi の `auth check` は拡張機能のプロバイダーを判定できないため、この経路では使いません。認証は Claude Code が管理します。呼び出し環境では `CLAUDE_CODE_MAX_RETRIES=0`、`CLAUDE_CODE_NO_MODEL_FALLBACK=1`、`CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK=1`、`CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1` を指定し、Claude Code 側の再試行と代替経路も無効にします。

この経路では、Claude Code の `claude_code` プリセットのシステムプロンプトに、課題のシステムプロンプトが追記されます。`metadata.json` の `harness.runner` は `pi-claude-bridge` になり、`harness.claudeBridge` に拡張機能のパス、ソースディレクトリの SHA-256、`settingSources`、システムプロンプトの扱いを保存します。モデルが受け取る文脈が API へ直接送る経路と違うため、`harness.runner` が `pi` の研究試行と同一条件として比較しないでください。ブリッジはモデルの単価を0として登録するため、保存される料金は `0` になります。これは無料や請求額を意味せず、料金の見積もりでもありません。判断の背景は [ADR 0031](adr/0031-allow-only-an-explicit-isolated-claude-bridge-extension-in-solve.md)、最初の実行条件と再現手順は [Claude Bridge Opus 5.5 ベースラインの再現条件](reports/claude-bridge-opus-5-5-baseline-2026-11-03.md) を参照してください。

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

`responses/` には最終回答だけを保存し、モデルの思考途中の本文は保存しません。`metadata.json` には課題集合、Pi の版、モデル、プロバイダー、思考量、試行全体のトークン数・料金・score を保存します。`calls.json` にはスキーマ版、提出プロトコル、課題集合と、課題ごとの応答・トークン数・料金・検証結果を保存します。採点結果は `result.json` に保存します。

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

| 終了コード | 意味                                                |
| ---------: | --------------------------------------------------- |
|          0 | 全課題が `passed`                                   |
|          1 | 1件以上が `failed`                                  |
|          2 | 1件以上が `disallowed`、`error` はなし              |
|          3 | 1件以上が `error`、または開始前の入力・Pi準備エラー |

自動テストは偽 Pi を使い、実モデルを呼びません。

## 保存済みの比較例

[Quantum Katas の4モデル・思考量別比較](reports/model-effort-matrix-2026-11-04.md) に、21条件の結果と再生成できる図を保存しています。保存済み記録の検証と描画にはモデル呼び出しは不要です。途中の時間上限変更と、人間が個別に承認した2条件の継続についても記載しています。

## 初期範囲外

- 複数モデルの一括実行
- 複数試行の自動実行
- 自動再試行
- モデルによる自己修正
- Pi に qni-cli やリポジトリの道具を使わせる共同研究者評価
- streaming、tool calling、複数候補生成
