# Feature: qni research solve

qni-cli の利用者として
モデルが見た課題情報と推定コストを研究試行として残すために
OpenAI互換 provider を使って qni research solve を実行したい。

## Background:

- Given 作業ディレクトリに solve 用の最小ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 OpenAI互換 provider は応答本文 "  qni add H --qubit 0 --step 1  " を返す
- Given 偽 OpenAI互換 provider をモデル "fake-qni" として登録する
- Given 環境変数 "QNI_FAKE_OPENAI_API_KEY" を "test-secret-api-key" に設定する

## Scenario: 偽 OpenAI互換 provider で研究試行を成功として保存する

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then コマンドは成功

## Scenario: モデルへ送ったプロンプトには課題本文、許可コマンド、出力ルール、最小限の qni 書式が含まれる

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 偽 OpenAI互換 provider が受け取ったプロンプトは次をすべて含む:

  ```text
  課題本文の目印: smoke-state-flip
  qni add
  回答は `.qni` 形式だけにしてください。
  qni add <gate> --qubit <index> --step <index>
  ```

## Scenario: モデルへ送ったプロンプトには採点情報が含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 偽 OpenAI互換 provider が受け取ったプロンプトは次をすべて含まない:

  ```text
  採点条件
  採点ケース
  準備コマンド
  期待される振幅
  期待値
  grading_cases
  setup_commands
  checks
  expected
  amplitude
  ```

## Scenario: モデル応答を trim した本文そのものが提出物として保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-flip.qni" の内容は:

  ```text
  qni add H --qubit 0 --step 1
  ```

## Scenario: モデル応答の保存成果物も提出物と同じ trim 済み本文になる

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "responses/state-flip.md" の内容は:

  ```text
  qni add H --qubit 0 --step 1
  ```

## Scenario: モデル応答から Markdown コードフェンスや qni 行を抽出しない

- Given 偽 OpenAI互換 provider は次の応答本文を返す:

  ````text
  ```qni
  qni add H --qubit 0 --step 1
  ```
  補足
  ````

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-flip.qni" の内容は:

  ````text
  ```qni
  qni add H --qubit 0 --step 1
  ```
  補足
  ````

## Scenario: 研究試行メタデータには solve の索引が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  {
    "model": {
      "registryId": "fake-qni",
      "provider": "openai-compatible",
      "apiModel": "fake-qni-api"
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
      "inputTokens": 100,
      "outputTokens": 20,
      "totalTokens": 120,
      "source": "provider_usage"
    },
    "cost": {
      "totalUsd": 0.00012,
      "perProblemUsd": 0.00012,
      "source": "estimated_from_model_registry",
      "inputCostPerMillionTokensUsd": 1,
      "outputCostPerMillionTokensUsd": 1
    },
    "calls": "calls.json"
  }
  ```

## Scenario: calls の索引には課題、プロンプト、応答、提出物、finish reason、tokens、cost の対応が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "calls.json" は次の部分 JSON を含む:

  ```json
  {
    "schemaVersion": 1,
    "calls": [
      {
        "taskId": "smoke/state-flip",
        "task": "benchmarks/smoke/state-flip.md",
        "prompt": "prompts/state-flip.md",
        "response": "responses/state-flip.md",
        "submission": "submissions/state-flip.qni",
        "provider": "openai-compatible",
        "apiModel": "fake-qni-api",
        "finishReason": "stop",
        "tokens": {
          "inputTokens": 100,
          "outputTokens": 20,
          "totalTokens": 120
        },
        "cost": {
          "totalUsd": 0.00012
        }
      }
    ]
  }
  ```

## Scenario: APIキーの値は保存された研究試行ファイルに含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル群は "test-secret-api-key" を含まない
