# モデル別コストベンチマーク PRD

## 概要

本PRDは、qni-cli に PhysicsIntern / CritPt 風のモデル別ベンチマーク機能を追加するための範囲を定義する。対象は、同じベンチマークスイートを複数のモデルに解かせ、採点結果、入力・出力トークン数、推定コストを研究試行として保存し、`cost per problem` と `score` の散布図で比較できる最小機能である。

初期スコープでは、qni-cli が直接 OpenAI互換 API を呼び、1モデル・1試行・1課題1呼び出しで `.qni` 提出物を生成する。モデルには採点用の YAML frontmatter を見せず、課題本文、許可コマンド、`.qni` 出力ルール、最小限の `qni` コマンド書式だけを渡す。

## 背景

既存の qni-cli は、Markdown + YAML frontmatter 形式のベンチマーク課題、`.qni` 提出物、`qni benchmark run-all` による決定論的な採点、`qni research record` による研究試行ログ保存を持つ。現在の `qni research record` は AI を呼び出さず、外部の共同研究者が作った prompt / response / submissions を受け取り、採点結果とともに `research/runs/` に保存する。

一方で、モデル別の能力と推定コストを比較するには、次が必要になる。

- 同一条件の課題表示でモデルに解かせること。
- 採点情報をモデルに隠すこと。
- モデルが返した提出物、実際に送ったプロンプト、応答、トークン使用量、推定コストを保存すること。
- 保存済み研究試行から `cost per problem` と `score` を可視化すること。

PhysicsIntern / CritPt の調査では、CritPt は challenge accuracy を主指標とし、PhysicsIntern はモデル登録ファイルに per million tokens の単価を持ち、次の式で推定コストを計算していた。

```text
cost_usd = (input_tokens * input_cost + output_tokens * output_cost) / 1_000_000
```

qni-cli でもこの単純な入出力トークン単価の推定から始める。

## 目的

- モデルがベンチマーク課題を解くために見た情報を制御し、採点情報を隠した公平な実行経路を作る。
- `qni research solve` で、単一モデルに単一ベンチマークスイートを解かせ、研究試行として保存できるようにする。
- 研究試行メタデータに score / tokens / cost / model / harness 情報を保存する。
- `qni research record` は AI を呼ばない手動記録コマンドとして維持し、採点結果から score だけを追加保存する。
- `qni research plot` で、保存済み研究試行から `cost per problem` vs `score` の自己完結 HTML を生成する。
- 外部 API に依存しない自動テストで、保存・集計・可視化の一連の動作を検証できるようにする。

## 非目標

初期スコープでは、次を行わない。

- Anthropic、Gemini、Hugging Face Inference など OpenAI互換 Chat Completions 以外のプロバイダー対応。
- OpenAI Responses API、tool calling、streaming、複数候補生成。
- Pi subagents、Claude Code、Codex など、リポジトリやツールへアクセスできるエージェントの自動実行。
- モデルによる自己修正、再試行、不合格課題だけの再プロンプト。
- `--models`、`--runs`、並列実行、rate limit 自動待機、途中再開。
- `qni research record` への手動 token / cost 入力。
- 既存 `research/runs` の migration / backfill。
- `qni research report` の人間向け表示や JSON 出力への tokens / cost / model 追加。
- PNG / PDF 出力、D3 依存、GitHub Pages 自動公開、interactive filtering、confidence interval。
- 実在モデルの単価表の同梱、自動更新。
- 実 API で特定モデルが何問解けるかを qni-cli の受け入れ条件にすること。

## 用語

- **研究試行**: 1つのベンチマークスイートに対する1回の共同研究者実行。`solve` でも `record` と同じくスイート単位で保存する。
- **モデル用課題ビュー**: モデルに渡してよい課題表現。課題ID、タイトル、許可コマンド、frontmatter を除いた課題本文、出力ルール、最小限の `qni` 書式を含む。
- **採点用課題**: 既存の Markdown + YAML frontmatter 全体。評価ランナーだけが読み、モデルには渡さない。
- **score**: `result.summary.passed / result.summary.total * 100` で計算する課題単位の合格率。
- **cost per problem**: 推定総コストを採点対象課題数で割った値。

## 公平性要件

`qni research solve` は、raw benchmark Markdown をモデルに渡してはならない。モデルに渡す情報は CLI 内で生成したモデル用課題ビューに限定する。

モデルへ渡してよい情報:

- `id`
- `title`
- `allowed_commands`
- frontmatter を除いた Markdown 本文
- `.qni` 出力ルール
- 固定の最小 `qni` コマンド書式リファレンス

モデルへ渡してはいけない情報:

- `checks`
- `grading_cases`
- `setup_commands`
- expected amplitudes / expected values
- 標準解
- 不正解サンプル
- `research/runs`
- raw YAML frontmatter 全体

テストでは、`qni research solve` が保存した `prompts/**.md` に、`checks`、`grading_cases`、`setup_commands`、expected amplitudes が含まれないことを検証する。

## CLI仕様

### `qni research solve`

最小形:

```bash
qni research solve \
  --model gpt-4.1-mini \
  --benchmark benchmarks/quantum-katas \
  --slug gpt-4-1-mini
```

必須引数:

- `--model <registry-id>`: `research/models.yaml` のモデル登録ID。
- `--benchmark <dir>`: ベンチマークスイートのディレクトリ。
- `--slug <slug>`: 研究試行ID末尾の slug。既存の slug 規則を使う。

初期スコープで追加しない引数:

- `--models-file`
- `--output-dir`
- `--temperature`
- `--max-tokens`
- `--system-prompt`
- `--prompt-template`
- `--dry-run`
- `--resume`
- `--runs`
- `--models`

動作:

1. `research/models.yaml` を読む。
2. `--model` の登録を解決する。
3. APIキー環境変数を確認する。
4. ベンチマークスイート内の課題を列挙する。
5. 各課題からモデル用課題ビューを生成する。
6. OpenAI互換 Chat Completions API を1課題につき1回、逐次実行する。
7. `choices[0].message.content` を生応答として保存する。
8. 応答本文を trim し、そのまま `.qni` 提出物として保存する。
9. provider が返した usage から tokens / cost を集計する。
10. `qni benchmark run-all` 相当で採点する。
11. 研究試行ディレクトリに prompt / response / submissions / result / calls / metadata / trial summary を保存する。
12. 採点結果の終了コードを返す。

終了コード:

- API / 設定 / usage 欠落など、研究試行が成立しない失敗: `3`。研究試行は作らない。
- 研究試行が成立し、採点結果が `passed`: `0`。
- 研究試行が成立し、採点結果が `failed`: `1`。
- 研究試行が成立し、採点結果が `disallowed`: `2`。
- 研究試行が成立し、採点結果が `error`: `3`。

モデル呼び出し自体が成功したが、応答が `.qni` として不正な場合は、提出物として保存し、採点結果の `failed` / `disallowed` / `error` として研究試行に残す。

### `qni research record`

`qni research record` は AI を呼ばない手動記録コマンドのまま維持する。初期統合では、採点結果から `score` を `metadata.json` と `trial.md` に追加する。

追加しないもの:

- `--input-tokens`
- `--output-tokens`
- `--total-cost-usd`
- `--model`
- `--metrics`

### `qni research plot`

最小形:

```bash
qni research plot \
  --benchmark benchmarks/quantum-katas \
  --output research/plots/cost-vs-score.html
```

必須引数:

- `--benchmark <dir>`: 対象ベンチマーク。異なるベンチマークを混ぜない。
- `--output <file>`: 自己完結 HTML の出力先。

動作:

- `research/runs/` の有効な研究試行を読む。
- `metadata.benchmark` が `--benchmark` と一致する trial だけを候補にする。
- `metadata.score.percent` と `metadata.cost.perProblemUsd` が数値として存在する trial を点にする。
- invalid trial、benchmark 不一致、metrics 欠損・不正を除外数として HTML に表示する。
- `research/plots/` など親ディレクトリが無い場合は作る。
- 出力先 HTML が既にある場合は上書きする。
- `research/runs/` の中身は変更しない。

初期出力:

- 依存なしの自己完結 HTML。
- inline SVG / inline JavaScript。
- x軸は `cost.perProblemUsd` の線形スケール。
- y軸は `score.percent` の線形スケール。範囲は 0〜100。
- 点のラベルは `metadata.model.registryId`、無ければ `collaborator`。
- 点の詳細として、trial id、benchmark、status、passed/total、tokens、total cost を埋め込む。

## モデル登録ファイル

`research/models.yaml` をリポジトリ管理の実験条件ファイルとして扱う。APIキーや秘密情報は保存しない。

初期スキーマ:

```yaml
models:
  gpt-4.1-mini:
    provider: openai-compatible
    api_model: gpt-4.1-mini
    base_url: https://api.openai.com/v1
    api_key_env: OPENAI_API_KEY
    input_cost_per_million_tokens_usd: 0.40
    output_cost_per_million_tokens_usd: 1.60
```

必須項目:

- `provider`: 初期は `openai-compatible` のみ。
- `api_model`: APIへ渡す実モデル名。
- `base_url`: OpenAI互換 API の base URL。
- `api_key_env`: APIキーを読む環境変数名。
- `input_cost_per_million_tokens_usd`: 入力トークン100万件あたりのUSD単価。
- `output_cost_per_million_tokens_usd`: 出力トークン100万件あたりのUSD単価。

初期スコープでは、単価が欠けているモデルは `qni research solve` の入力エラーとして扱う。研究試行は作らず、終了コード `3` を返す。

## OpenAI互換接続

初期のモデル呼び出しは、OpenAI SDK を追加せず、Node.js 標準の `fetch` で `/chat/completions` を直接呼ぶ。

リクエスト例:

```json
{
  "model": "gpt-4.1-mini",
  "temperature": 0,
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

固定する生成条件:

```json
{
  "temperature": 0,
  "stream": false,
  "n": 1,
  "maxTokens": null
}
```

レスポンスから読むもの:

- `choices[0].message.content`
- `choices[0].finish_reason`
- `usage.prompt_tokens`
- `usage.completion_tokens`
- `usage.total_tokens`

usage が欠けている場合は、cost benchmark として成立しないため、研究試行を作らず終了コード `3` で失敗する。

## 研究試行ディレクトリ

`qni research solve` が作る研究試行ディレクトリは、既存の構造を保ちつつ課題ごとの prompt / response と calls を追加する。

```text
research/runs/<timestamp>-<slug>/
├── trial.md
├── metadata.json
├── prompt.md
├── response.md
├── prompts/
│   └── basic-gates/
│       └── toffoli-gate.md
├── responses/
│   └── basic-gates/
│       └── toffoli-gate.md
├── submissions/
│   └── basic-gates/
│       └── toffoli-gate.qni
├── calls.json
└── result.json
```

各ファイルの意味:

- `prompt.md`: スイート全体の実行条件、プロンプト生成ルール、対象ベンチマークの要約。
- `response.md`: スイート全体のモデル応答要約、課題ごとの出力先一覧。
- `prompts/`: 実際に API へ送った課題ごとの完全プロンプト。
- `responses/`: API から返った課題ごとの生応答。
- `submissions/`: 採点対象にした `.qni` 提出物。
- `calls.json`: prompt / response / submission / usage / cost の対応表。
- `result.json`: `qni benchmark run-all --json` 相当の採点結果。
- `metadata.json`: 試行単位の機械処理向け索引。
- `trial.md`: 人間向けの浅い要約。

## `metadata.json` の追加フィールド

`schemaVersion` は初期実装では `1` のままにし、任意フィールドを追加する。既存 trial はそのまま有効とする。

例:

```json
{
  "schemaVersion": 1,
  "id": "2026-07-02T120000Z-gpt-4-1-mini",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "collaborator": "gpt-4.1-mini",
  "benchmark": "benchmarks/quantum-katas",
  "submissions": "submissions",
  "prompt": "prompt.md",
  "response": "response.md",
  "result": "result.json",
  "status": "failed",
  "score": {
    "passed": 21,
    "total": 22,
    "percent": 95.45454545454545,
    "source": "result.json"
  },
  "model": {
    "registryId": "gpt-4.1-mini",
    "provider": "openai-compatible",
    "apiModel": "gpt-4.1-mini"
  },
  "generation": {
    "temperature": 0,
    "stream": false,
    "n": 1,
    "maxTokens": null
  },
  "harness": {
    "name": "qni-cli",
    "command": "qni research solve",
    "benchmarkRunner": "qni benchmark run-all",
    "promptView": "sanitized-benchmark-task",
    "submissionExtraction": "strict-trimmed-response"
  },
  "tokens": {
    "inputTokens": 12345,
    "outputTokens": 6789,
    "totalTokens": 19134,
    "source": "provider_usage"
  },
  "cost": {
    "totalUsd": 0.1234,
    "perProblemUsd": 0.005609090909090909,
    "source": "estimated_from_model_registry",
    "inputCostPerMillionTokensUsd": 0.4,
    "outputCostPerMillionTokensUsd": 1.6
  },
  "calls": "calls.json"
}
```

`model` には `baseUrl`、`apiKeyEnv`、APIキー、HTTP headers を保存しない。接続情報は `research/models.yaml` に残す。

`score` / `model` / `tokens` / `cost` が壊れていても、研究試行自体は invalid にしない。`qni research plot` が metrics 欠損・不正として除外する。

## `calls.json`

`calls.json` は本文を持たず、各 Markdown ファイルへの参照と計測値だけを保存する。

例:

```json
{
  "schemaVersion": 1,
  "calls": [
    {
      "taskId": "basic-gates/toffoli-gate",
      "task": "benchmarks/quantum-katas/basic-gates/toffoli-gate.md",
      "prompt": "prompts/basic-gates/toffoli-gate.md",
      "response": "responses/basic-gates/toffoli-gate.md",
      "submission": "submissions/basic-gates/toffoli-gate.qni",
      "provider": "openai-compatible",
      "apiModel": "gpt-4.1-mini",
      "finishReason": "stop",
      "tokens": {
        "inputTokens": 1000,
        "outputTokens": 300,
        "totalTokens": 1300
      },
      "cost": {
        "totalUsd": 0.00088
      }
    }
  ]
}
```

保存しないもの:

- prompt 本文
- response 本文
- provider の生 JSON 全体
- APIキー
- HTTP headers

## スコア定義

初期スコープでは、課題単位の単純合格率だけを score とする。

```text
score.passed = result.summary.passed
score.total = result.summary.total
score.percent = passed / total * 100
```

扱い:

- `failed` / `disallowed` / `error` の課題は未合格として数える。
- `grading_cases` や `checks` の部分点は付けない。
- 難度重み付けはしない。
- `total = 0` の研究試行は score 不明としてプロット対象外。
- 複数試行平均、標準偏差、信頼区間は後続で扱う。

## コスト定義

各呼び出しの推定コスト:

```text
call_cost_usd = (
  inputTokens * inputCostPerMillionTokensUsd +
  outputTokens * outputCostPerMillionTokensUsd
) / 1_000_000
```

研究試行の推定総コスト:

```text
totalUsd = Σ call_cost_usd
```

`cost per problem`:

```text
perProblemUsd = totalUsd / score.total
```

分母は採点対象課題数 `score.total` に固定する。`passed` 数や API 呼び出し回数では割らない。

実行時に使った単価は、`metadata.json` の `cost` にスナップショット保存する。JSON のコスト値は丸めずに `number` として保存し、人間向け表示だけ読みやすく整形する。

## `trial.md`

`trial.md` は既存の浅い要約に加えて、score / model / tokens / cost を表示する。値が無い場合は表示しない。

例:

```md
# Research trial: gpt-4-1-mini

- collaborator: gpt-4.1-mini
- benchmark: benchmarks/quantum-katas
- status: failed
- tasks: 22
- passed: 21
- failed: 1
- disallowed: 0
- error: 0
- score: 95.45%
- model: gpt-4.1-mini
- tokens: input 12345, output 6789, total 19134
- cost: total $0.1234, per problem $0.00561

## Files

- Prompt: ./prompt.md
- Response: ./response.md
- Per-task prompts: ./prompts/
- Per-task responses: ./responses/
- Submissions: ./submissions/
- Calls: ./calls.json
- Result: ./result.json
```

## 実装方針

- 機能追加前に `features/*.feature.md` を追加する。
- `record` と `solve` は別々の CLI コマンドとして扱う。
- 研究試行ディレクトリを書き出す処理は、共通の内部モジュールへ切り出す。
- `solve` はモデル呼び出し、プロンプト生成、calls 作成を担当し、保存は共通モジュールに渡す。
- CLI コマンド同士をサブプロセス的に呼ばない。
- `research_report.ts` の valid / invalid 判定は、初期スコープでは既存必須項目と `result.json` 整合性のまま維持する。
- `qni research plot` は、追加 metrics の妥当性を自分の対象判定として見る。

## 新しい ADR

実装時には、新しい ADR を追加して次を明文化する。

- `qni research record` は AI を呼ばない研究試行ログ作成コマンドとして維持する。
- `qni research solve` は、モデル実行、提出物生成、採点、研究試行保存まで行う上位自動化である。
- 両者は共通の研究試行ディレクトリ形式を使う。
- `solve` の AI 呼び出し条件、usage、cost は研究試行メタデータとして保存する。

これにより、既存 ADR 0005 の「研究試行ログの初期機能では qni-cli は AI モデルを直接呼び出さない」という判断を破るのではなく、`record` と `solve` の責務差として発展させる。

## テスト方針

自動テストでは実際の外部 API を呼ばない。Cucumber の step definition でローカル HTTP サーバーを立て、OpenAI互換 endpoint として扱う。

- `research/models.yaml` の `base_url` に localhost URL を書く。
- `api_key_env` はテスト用の環境変数名にする。
- `qni research solve` は本番と同じ OpenAI互換接続部を通る。
- 偽サーバーで usage あり応答、usage 欠落応答、エラー応答を再現する。
- `npm run check` は APIキーなし・外部ネットワークなしで成功する。

単体テストでは、必要に応じて `fetch` 相当の関数注入で OpenAI互換接続部を検証する。

## 受け入れ条件

### feature-first

実装前に、少なくとも次の feature ファイルを追加する。

```text
features/cli/research_metadata_score.feature.md
features/cli/research_solve.feature.md
features/cli/research_plot.feature.md
```

### `record` と score

- `qni research record` が作る `metadata.json` に `score.passed`、`score.total`、`score.percent`、`score.source` が保存される。
- `trial.md` に score の浅い要約が表示される。
- 既存の `research report` の出力互換性が保たれる。

### 採点情報を隠すプロンプト

- `qni research solve` が保存する `prompts/**.md` に課題本文、許可コマンド、出力ルール、最小 `qni` 書式が含まれる。
- `prompts/**.md` に `checks`、`grading_cases`、`setup_commands`、expected amplitudes が含まれない。
- raw benchmark Markdown 全体を API に送らない。

### `solve` の保存物

- 偽 OpenAI互換 provider の usage から `metadata.tokens` と `metadata.cost` が保存される。
- 実行時の単価スナップショットが `metadata.cost` に保存される。
- `calls.json` に各課題の prompt / response / submission 参照、tokens、cost、finishReason が保存される。
- `prompts/`、`responses/`、`submissions/` が課題ごとに保存される。
- `metadata.score.total` と `calls.length` が一致する。
- `qni benchmark run-all` 相当の結果が `result.json` に保存される。

### `solve` の失敗処理

- API接続失敗、認証失敗、エラー応答、usage 欠落、空応答では研究試行を作らず、終了コード `3` を返す。
- モデルが不正な `.qni` 内容を返した場合は研究試行を保存し、採点結果に応じた終了コードを返す。

### `plot`

- `qni research plot --benchmark <dir> --output <file>` が自己完結 HTML を作る。
- cost と score を持つ trial が散布図の点として HTML に含まれる。
- invalid trial、benchmark 不一致、metrics 欠損・不正の除外数が HTML に表示される。
- 出力先の親ディレクトリが無い場合は作成される。
- 既存 HTML は上書きされる。
- `research/runs/` は変更されない。

### 検証

- `npm run check` が APIキーなしで成功する。

## リスクと対策

### モデルが採点情報を見てしまう

リスク: raw benchmark Markdown を渡すと、`checks` や `grading_cases` から答えが漏れる。

対策: `solve` は必ずモデル用課題ビューを生成し、raw ファイルを送らない。保存済み prompt に採点情報が含まれないことをテストする。

### provider が usage を返さない

リスク: cost benchmark として比較できない trial が混ざる。

対策: 初期スコープでは usage 欠落を実行エラー扱いにし、研究試行を保存しない。

### モデル価格が後から変わる

リスク: `research/models.yaml` の更新後に過去 trial の cost が再現できなくなる。

対策: 実行時に使った単価を `metadata.cost` にスナップショット保存する。

### `record` と `solve` の責務が混ざる

リスク: 既存の no-AI 研究ログ機能が複雑化する。

対策: `record` は AI を呼ばないまま維持し、`solve` を上位自動化として追加する。保存処理だけ共通内部モジュールに切り出す。

### 散布図に意味の違う trial が混ざる

リスク: 異なるベンチマークや metrics 欠損 trial が同じ図に混ざる。

対策: `plot` では `--benchmark` を必須にし、score / cost がある trial だけを点にする。除外数を HTML に表示する。

### 実 API テストが不安定になる

リスク: APIキー、ネットワーク、rate limit、モデル廃止により `npm run check` が不安定になる。

対策: 自動テストは localhost の偽 OpenAI互換サーバーだけを使う。実 API での確認は手動手順に分ける。

## 実装順序

1. `features/cli/research_metadata_score.feature.md` を追加する。
2. `qni research record` の研究試行メタデータに `score` を追加する。
3. 研究試行ディレクトリ書き出し処理を共通内部モジュールへ切り出す。
4. 新しい ADR を追加し、`record` と `solve` の責務差を明文化する。
5. `features/cli/research_solve.feature.md` を追加する。
6. モデル用課題ビューとプロンプト生成を実装し、採点情報を隠す。
7. `research/models.yaml` の読み取りとコスト計算を実装する。
8. OpenAI互換接続部を実装する。
9. localhost 偽 OpenAI互換サーバーを使うテストを追加する。
10. `qni research solve` を実装し、単一モデル・単一試行を保存する。
11. `features/cli/research_plot.feature.md` を追加する。
12. `qni research plot` の自己完結 HTML 出力を実装する。
13. 利用手順と制限事項を docs に追加する。
14. `npm run check` を通す。

## issue 分割案

1. 研究試行メタデータに score を追加し、試行書き出し処理を共通化する。
2. `record` と `solve` の責務差を ADR に記録する。
3. モデル用課題ビューとプロンプト生成で採点情報を隠す。
4. `research/models.yaml` とトークン単価によるコスト計算を追加する。
5. OpenAI互換接続部で1課題を呼び出す内部処理を追加する。
6. `qni research solve` で単一モデル・単一試行を記録する。
7. `qni research plot` で `cost per problem` vs `score` の自己完結 HTML を出力する。
8. 利用手順、制限事項、手動実 API 確認手順を docs に追加する。

## 将来拡張

- `qni research solve --runs N`
- `qni research solve --models a,b,c`
- 並列実行と rate limit 対応。
- 不合格課題の再試行や自己修正ループ。
- prompt dry-run / prompt audit コマンド。
- `qni research record --metrics metrics.json` による外部 token / cost 入力。
- `qni research report` への model / score / cost 表示追加。
- 複数試行平均、標準偏差、信頼区間。
- base model と harness variant の点線接続。
- log scale、フィルタリング、CSV / JSON plot data 出力。
- Anthropic、Gemini、Hugging Face Inference などの追加プロバイダー。
- 実行時の git commit、qni-cli version、Node.js version、所要時間の保存。
