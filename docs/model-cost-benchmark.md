# モデル別コストベンチマーク利用手順

この文書は、`qni research solve` でモデルにベンチマークスイートを解かせ、`qni research plot` で score と cost per problem を可視化するための利用手順です。利用者が実 API を呼び出す前に、モデル登録、APIキー環境変数、保存される研究試行、計算式、初期スコープの制限を確認できるようにまとめます。

以下の例はリポジトリルートから実行します。開発中の作業ツリーで試す場合は、先に `npm run build` を実行し、`qni` を `node dist/bin/qni.js` に読み替えてください。

## 実行前に確認すること

`qni research record` と `qni research solve` は、同じ研究試行ディレクトリ形式を使いますが、AI 呼び出しの有無が違います。

- `qni research record` は AI を呼びません。外部の AI、人間、Pi、Claude、Codex などが作ったプロンプト、回答、提出物ディレクトリを受け取り、qni-cli の評価ランナーで採点して研究試行として保存します。
- `qni research solve` は AI を呼ぶ上位自動化です。初期スコープでは、`research/models.yaml` に登録した単一モデルを使い、OpenAI互換 Chat Completions API を qni-cli が直接呼び出します。
- APIキーの値はリポジトリに保存しません。モデル登録ファイルには、APIキーを読む環境変数名だけを書きます。

`solve` の実行は外部 API の料金、ネットワーク、rate limit の影響を受けます。自動検証の `npm run check` は localhost の偽 OpenAI互換 provider だけを使うため、実 API キーや外部ネットワークは必須ではありません。

## モデル登録ファイルを書く

`qni research solve` は、現在は固定の `research/models.yaml` を読みます。`--models-file` のような別ファイル指定は初期スコープ外です。`research/models.yaml` は、接続先と単価を記録する実験条件ファイルとして扱い、秘密情報は入れません。

最小スキーマは次の形です。

```yaml
models:
  gpt-4-1-mini:
    provider: openai-compatible
    api_model: gpt-4.1-mini
    base_url: https://api.openai.com/v1
    api_key_env: OPENAI_API_KEY
    input_cost_per_million_tokens_usd: 0.40
    output_cost_per_million_tokens_usd: 1.60
```

各項目の意味は次のとおりです。

| 項目 | 意味 |
| --- | --- |
| `models.<id>` | `qni research solve --model <id>` で指定する登録IDです。 |
| `provider` | 初期スコープでは `openai-compatible` だけを受け付けます。 |
| `api_model` | API の `model` フィールドへ渡す実モデル名です。 |
| `base_url` | OpenAI互換 API の base URL です。qni-cli は末尾に `/chat/completions` を付けて呼び出します。 |
| `api_key_env` | APIキーを読む環境変数名です。APIキーの値そのものは書きません。 |
| `input_cost_per_million_tokens_usd` | 入力トークン100万件あたりの USD 単価です。 |
| `output_cost_per_million_tokens_usd` | 出力トークン100万件あたりの USD 単価です。 |

単価や接続情報が欠けているモデルは入力エラーです。この場合、研究試行ディレクトリは作られず、終了コード `3` で失敗します。`api_key_env` で指定した環境変数が未設定または空の場合も同じく終了コード `3` です。

APIキーは、実行するシェルで環境変数として渡します。

```bash
export OPENAI_API_KEY='sk-...'
```

`OPENAI_API_KEY` の部分は、モデル登録ファイルの `api_key_env` と一致させてください。

## `qni research solve` を実行する

最小形は次のとおりです。

```bash
qni research solve \
  --model gpt-4-1-mini \
  --benchmark benchmarks/quantum-katas \
  --slug gpt-4-1-mini
```

この実行は、単一モデル・単一試行・逐次実行です。ベンチマークスイート内の課題を再帰的に列挙し、1課題につき OpenAI互換 Chat Completions API を1回だけ呼び出します。複数課題を同時には投げず、課題ファイル名の順に処理します。

`solve` は次の流れで研究試行を作ります。

1. `research/models.yaml` を読み、`--model` の登録を解決します。
2. `api_key_env` の環境変数から APIキーを読みます。
3. ベンチマーク課題から、モデルに見せてよい課題ビューを生成します。
4. 課題ごとに OpenAI互換 Chat Completions API を呼び出します。
5. `choices[0].message.content` の生応答を保存し、空白を除いて空なら試行不成立にします。
6. 応答を `blind-neutral-circuit-json-v1` の中立回路 JSON として厳格に検証し、妥当な場合は `circuit-json/` に保存して `.qni` 提出物へ変換します。
7. provider の `usage.prompt_tokens`、`usage.completion_tokens`、`usage.total_tokens` からトークン数と推定コストを集計します。
8. `qni benchmark run-all` 相当の採点を実行します。
9. `research/runs/<timestamp>-<slug>/` にプロンプト、応答、中立 JSON、提出物、採点結果、calls、メタデータ、要約を保存します。

モデルに渡す課題ビューには、frontmatter の `available_gates` と frontmatter を除いた中立課題本文、中立 JSON 出力ルールだけを含めます。`qni`、`.qni`、許可コマンド、採点用の `checks`、`grading_cases`、`setup_commands`、期待振幅、期待値、標準解、不正解サンプル、`research/runs` は渡しません。

保存される主なファイルは次のとおりです。

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

`prompts/` には実際に送った課題ごとのプロンプト、`responses/` には provider から返った課題ごとの生応答、`circuit-json/` には検証済みの中立 JSON 提出、`submissions/` には採点対象の `.qni` 提出物を保存します。`calls.json` には本文を重複保存せず、各課題のプロンプト、応答、中立 JSON、提出物への相対パス、finish reason、トークン数、推定コスト、`submissionProtocol` を保存します。`metadata.json` には `submissionProtocol`、`model`、`generation`、`harness`、`tokens`、`cost`、`score` などの索引を保存しますが、`base_url`、`api_key_env`、APIキー、HTTP headers は保存しません。

終了コードは次のとおりです。

| 終了コード | 意味 |
| --- | --- |
| `0` | 研究試行が成立し、採点状態が `passed`。 |
| `1` | 研究試行が成立し、採点状態が `failed`。 |
| `2` | 研究試行が成立し、採点状態が `disallowed`。 |
| `3` | API、設定、usage 欠落、空応答、保存失敗、または採点状態 `error`。 |

API 接続失敗、認証失敗、エラー応答、usage 欠落、空応答では、コストベンチマークとして成立しないため研究試行を作りません。モデル応答が空ではないが JSON 形式違反またはスキーマ違反の場合は、生応答と不許可扱いの提出物を保存し、該当課題を `disallowed` として `score.total` に含めます。

## `qni research plot` を実行する

保存済みの研究試行から散布図を作るには、対象ベンチマークと出力先 HTML を指定します。

```bash
qni research plot \
  --benchmark benchmarks/quantum-katas \
  --output research/plots/cost-vs-score.html
```

`plot` は `research/runs/` を読み、`metadata.benchmark` が `--benchmark` と一致し、`metadata.score.percent` と `metadata.cost.perProblemUsd` が数値として存在する研究試行だけを点にします。無効な研究試行、ベンチマーク不一致、score や cost の欠損・不正は除外し、除外数を HTML に表示します。

出力先の親ディレクトリがなければ作成します。出力先 HTML が既にある場合は上書きします。`research/runs/` の中身は変更しません。

HTML の読み方は次のとおりです。

- 横軸は `cost per problem` です。単位は USD で、線形スケールです。
- 縦軸は `score percent` です。範囲は 0〜100 の線形スケールです。
- 点のラベルは `metadata.model.registryId` を優先し、無ければ `collaborator` を使います。
- 詳細表では、研究試行ID、ベンチマーク、採点状態、合格数/課題数、トークン数、推定総コスト、cost per problem、score を確認できます。
- 除外数の一覧で、図に入らなかった研究試行の種類を確認できます。

## score と cost の定義

初期スコープの score は、課題単位の単純な合格率です。

```text
score.passed = result.summary.passed
score.total = result.summary.total
score.percent = score.passed / score.total * 100
```

`failed`、`disallowed`、`error` の課題は未合格として数えます。採点ケースや検証項目の部分点、難度による重み付け、複数試行の平均、標準偏差、信頼区間は扱いません。`score.total = 0` の研究試行は、score と cost per problem が定義できないためプロット対象外です。

各 API 呼び出しの推定コストは次の式で計算します。

```text
call_cost_usd = (
  inputTokens * inputCostPerMillionTokensUsd +
  outputTokens * outputCostPerMillionTokensUsd
) / 1_000_000
```

研究試行全体の推定総コストと cost per problem は次の式です。

```text
totalUsd = Σ call_cost_usd
cost.perProblemUsd = totalUsd / score.total
```

`cost per problem` の分母は採点対象課題数 `score.total` です。合格数や API 呼び出し回数では割りません。コストは provider が返した usage とモデル登録ファイルの単価から計算した推定値であり、実際の請求額を保証するものではありません。実行時に使った単価は `metadata.json` の `cost` にスナップショットとして保存します。

## 初期スコープ外のこと

次の項目は、モデル別コストベンチマークの初期スコープ外です。

- 複数モデルの一括実行。
- 複数試行の自動実行。
- 失敗時の再試行。
- モデルによる自己修正。
- Pi、Claude Code、Codex など外部エージェントの自動実行。
- 既存の研究試行ディレクトリの移行。
- OpenAI互換 Chat Completions API 以外のネイティブ provider。
- streaming、tool calling、複数候補生成。
- `qni research record` への手動 token / cost 入力。

`qni research solve` は、OpenAI互換 Chat Completions API を qni-cli が直接呼び出す経路に限ります。複数エージェント処理や、リポジトリ内で外部エージェントを自動操作する仕組みは含みません。

## 任意の実 API 手動確認

実 API での確認は任意です。`npm run check` の必須条件ではありません。`npm run check` は外部 API キーなしで成功するように、偽 OpenAI互換 provider を使います。

実 API を手動で試す場合の最小手順は次のとおりです。

```bash
npm run build

mkdir -p research
cat > research/models.yaml <<'YAML'
models:
  gpt-4-1-mini:
    provider: openai-compatible
    api_model: gpt-4.1-mini
    base_url: https://api.openai.com/v1
    api_key_env: OPENAI_API_KEY
    input_cost_per_million_tokens_usd: 0.40
    output_cost_per_million_tokens_usd: 1.60
YAML

export OPENAI_API_KEY='sk-...'

node dist/bin/qni.js research solve \
  --model gpt-4-1-mini \
  --benchmark benchmarks/quantum-katas \
  --slug gpt-4-1-mini-manual

node dist/bin/qni.js research plot \
  --benchmark benchmarks/quantum-katas \
  --output research/plots/cost-vs-score.html
```

実行前に、利用する provider の料金、利用規約、rate limit を確認してください。APIキーの値は `research/models.yaml`、`metadata.json`、`calls.json`、`trial.md`、プロンプト、応答、提出物に書かないでください。
