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

  ```text
  qni add H --qubit 0 --step 1
  ```

## Scenario: 複数課題の2つ目の提出物が保存される

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-return.qni" の内容は:

  ```text
  qni add H --qubit 0 --step 1
  ```

## Scenario: calls の件数と score の分母が一致する

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行の calls 件数と score の分母は 2

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

## Scenario: 不正な `.qni` 応答では採点結果に対応する終了コードを返す

- Given 偽 OpenAI互換 provider は応答本文 "これは qni コマンドではありません" を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 終了コードは 3

## Scenario: 不正な `.qni` 応答は研究試行に保存される

- Given 偽 OpenAI互換 provider は応答本文 "これは qni コマンドではありません" を返す
- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル "submissions/state-flip.qni" の内容は:

  ```text
  これは qni コマンドではありません
  ```

## Scenario: APIキーの値は保存された研究試行ファイルに含まれない

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --slug fake-openai" を実行
- Then 研究試行ファイル群は "test-secret-api-key" を含まない
