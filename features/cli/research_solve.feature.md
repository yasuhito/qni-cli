# Feature: qni research solve

qni-cli の利用者として
モデルに qni-cli 固有の提出形式を知らせずに課題を解かせるために
OpenAI互換 provider から中立回路 JSON を受け取り、研究試行として採点したい。

## Background:

- Given 作業ディレクトリに solve 用の最小ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 OpenAI互換 provider は次の応答本文を返す:

  ```json
  {
    "operations": [
      {
        "gate": "H",
        "targets": [0]
      }
    ]
  }
  ```

- Given 偽 OpenAI互換 provider をモデル "fake-qni" として登録する
- Given 環境変数 "QNI_FAKE_OPENAI_API_KEY" を "test-secret-api-key" に設定する

## Scenario: 偽 OpenAI互換 provider の中立 JSON で研究試行を成功として保存する

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then コマンドは成功

## Scenario: モデルへ送ったプロンプトには課題本文、利用可能ゲート、中立 JSON 出力ルールが含まれる

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 偽 OpenAI互換 provider が受け取ったプロンプトは次をすべて含む:

  ```text
  課題本文の目印: smoke-state-flip
  available_gates
  H(target)
  有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
  operations
  ```

## Scenario: モデルへ送ったプロンプトには qni-cli 固有表現が含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 偽 OpenAI互換 provider が受け取ったプロンプトは次をすべて含まない:

  ```text
  qni
  .qni
  qni add
  qni run
  qni expect
  allowed_commands
  setup_commands
  ```

## Scenario: 保存された課題別プロンプトには qni-cli 固有表現が含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "prompts/state-flip.md" は次をすべて含まない:

  ```text
  qni
  .qni
  qni add
  qni run
  qni expect
  allowed_commands
  setup_commands
  ```

## Scenario: provider の生応答が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "responses/state-flip.md" の内容は:

  ```json
  {
    "operations": [
      {
        "gate": "H",
        "targets": [0]
      }
    ]
  }
  ```

## Scenario: 検証済みの中立 JSON 提出が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "circuit-json/state-flip.json" は次の部分 JSON を含む:

  ```json
  {
    "operations": [
      {
        "gate": "H",
        "targets": [0]
      }
    ]
  }
  ```

## Scenario: 中立 JSON から変換した .qni 提出物が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-flip.qni" の内容は:

  ```text
  qni add H --qubit 0 --step 0
  ```

## Scenario: responses ディレクトリが保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリ "responses" が作られる

## Scenario: circuit-json ディレクトリが保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリ "circuit-json" が作られる

## Scenario: submissions ディレクトリが保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリ "submissions" が作られる

## Scenario: result.json が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "result.json" が作られる

## Scenario: 研究試行メタデータには中立 JSON 提出プロトコルと solve の索引が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  {
    "submissionProtocol": "blind-neutral-circuit-json-v1",
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
      "promptView": "neutral-benchmark-task",
      "submissionExtraction": "strict-neutral-circuit-json-conversion",
      "submissionProtocol": "blind-neutral-circuit-json-v1"
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

## Scenario: calls の索引には中立 JSON 提出プロトコル、課題、プロンプト、応答、提出物、finish reason、tokens、cost の対応が保存される

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "calls.json" は次の部分 JSON を含む:

  ```json
  {
    "schemaVersion": 1,
    "submissionProtocol": "blind-neutral-circuit-json-v1",
    "calls": [
      {
        "taskId": "smoke/state-flip",
        "task": "benchmarks/smoke/state-flip.md",
        "prompt": "prompts/state-flip.md",
        "response": "responses/state-flip.md",
        "circuitJson": "circuit-json/state-flip.json",
        "submission": "submissions/state-flip.qni",
        "submissionProtocol": "blind-neutral-circuit-json-v1",
        "provider": "openai-compatible",
        "apiModel": "fake-qni-api",
        "finishReason": "stop",
        "responseValidation": {
          "status": "valid"
        },
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

## Scenario: 複数課題のベンチマークスイートは1課題1呼び出しで逐次実行される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 偽 OpenAI互換 provider への呼び出しは次の順で行われる:

  ```text
  smoke-state-flip
  smoke-state-return
  ```

## Scenario: 複数課題の2つ目のプロンプトが保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "prompts/state-return.md" は "smoke-state-return" を含む

## Scenario: 複数課題の2つ目の応答が保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "responses/state-return.md" の内容は:

  ```json
  {
    "operations": [
      {
        "gate": "H",
        "targets": [0]
      }
    ]
  }
  ```

## Scenario: 複数課題の2つ目の中立 JSON 提出が保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "circuit-json/state-return.json" は次の部分 JSON を含む:

  ```json
  {
    "operations": [
      {
        "gate": "H",
        "targets": [0]
      }
    ]
  }
  ```

## Scenario: 複数課題の2つ目の提出物が保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-return.qni" の内容は:

  ```text
  qni add H --qubit 0 --step 0
  ```

## Scenario: 複数課題の calls 件数は課題数と一致する

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行の calls 件数は 2

## Scenario: 複数課題の score 分母は課題数と一致する

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行の score 分母は 2

## Scenario: 研究試行の tokens は calls の合計から保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "tokens" は次の JSON と一致する:

  ```json
  {
    "inputTokens": 200,
    "outputTokens": 40,
    "totalTokens": 240,
    "source": "provider_usage"
  }
  ```

## Scenario: 研究試行の cost は calls の合計と score の分母から保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "cost" は次の JSON と一致する:

  ```json
  {
    "totalUsd": 0.00024,
    "perProblemUsd": 0.00012,
    "source": "estimated_from_model_registry",
    "inputCostPerMillionTokensUsd": 1,
    "outputCostPerMillionTokensUsd": 1
  }
  ```

## Scenario: 研究試行の score はスイート全体の採点結果から保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "score" は次の JSON と一致する:

  ```json
  {
    "passed": 2,
    "total": 2,
    "percent": 100,
    "source": "result.json"
  }
  ```

## Scenario: calls の件数と score の分母が一致しない場合は終了コード3を返す

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 OpenAI互換 provider は呼び出し時に "benchmarks/smoke/state-return.md" を削除する
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 3

## Scenario: calls の件数と score の分母が一致しない場合は研究試行を保存しない

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 OpenAI互換 provider は呼び出し時に "benchmarks/smoke/state-return.md" を削除する
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: usage 欠落では終了コード3を返す

- Given 偽 OpenAI互換 provider は usage 欠落応答を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 3

## Scenario: usage 欠落では研究試行を保存しない

- Given 偽 OpenAI互換 provider は usage 欠落応答を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: provider エラーでは終了コード3を返す

- Given 偽 OpenAI互換 provider は HTTP 500 エラーを返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 3

## Scenario: provider エラーでは研究試行を保存しない

- Given 偽 OpenAI互換 provider は HTTP 500 エラーを返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: 空応答では終了コード3を返す

- Given 偽 OpenAI互換 provider は応答本文 "   " を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 3

## Scenario: 空応答では研究試行を保存しない

- Given 偽 OpenAI互換 provider は応答本文 "   " を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: JSON 形式違反の応答では採点結果に対応する終了コードを返す

- Given 偽 OpenAI互換 provider は応答本文 "これは JSON ではありません" を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 2

## Scenario: JSON 形式違反の応答は disallowed として研究試行に保存される

- Given 偽 OpenAI互換 provider は応答本文 "これは JSON ではありません" を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "result.json" は次の部分 JSON を含む:

  ```json
  {
    "status": "disallowed",
    "summary": {
      "total": 1,
      "passed": 0,
      "failed": 0,
      "disallowed": 1,
      "error": 0
    },
    "results": [
      {
        "status": "disallowed",
        "submission": "submissions/state-flip.qni"
      }
    ]
  }
  ```

## Scenario: JSON 形式違反の生応答は研究試行に保存される

- Given 偽 OpenAI互換 provider は応答本文 "これは JSON ではありません" を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "responses/state-flip.md" の内容は:

  ```text
  これは JSON ではありません
  ```

## Scenario: スキーマ違反の応答も disallowed として研究試行に保存される

- Given 偽 OpenAI互換 provider は次の応答本文を返す:

  ```json
  {
    "operations": [
      {
        "gate": "X",
        "targets": [0]
      }
    ]
  }
  ```

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行 JSON ファイル "result.json" は次の部分 JSON を含む:

  ```json
  {
    "status": "disallowed",
    "summary": {
      "total": 1,
      "disallowed": 1
    },
    "results": [
      {
        "status": "disallowed"
      }
    ]
  }
  ```

## Scenario: APIキーの値は保存された研究試行ファイルに含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル群は "test-secret-api-key" を含まない
