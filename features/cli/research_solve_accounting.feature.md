# Feature: 実行エラーの利用量を欠測と区別して保持する

qni-cli の利用者として
不一致や中断を含めた実際の消費量を失わないために
モデルのエラー応答でも報告された利用量と応答元を部分記録に残し、未知の値は null として扱いたい。

## Background:

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する

## Scenario: エラー応答にも利用量があれば保持する

- Given 偽 Pi は停止理由 "error" とエラー "QNI_DUMMY_QUOTA" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "finishReason": "error",
    "tokens": {
      "inputTokens": 100,
      "outputTokens": 20,
      "cacheReadTokens": 5,
      "totalTokens": 125
    },
    "cost": { "totalUsd": 0.00012 },
    "error": "Pi execution error: QNI_DUMMY_QUOTA"
  }
  ```

## Scenario: 中断応答にも利用量があれば保持する

- Given 偽 Pi は停止理由 "aborted" とエラー "QNI_DUMMY_ABORT" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "finishReason": "aborted",
    "tokens": { "outputTokens": 20 },
    "cost": { "totalUsd": 0.00012 }
  }
  ```

## Scenario: 異なるプロバイダーの利用量と実際の応答元を保持する

- Given 偽 Pi は応答プロバイダー "other-provider" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "provider": "other-provider",
    "model": "fake-qni",
    "tokens": { "outputTokens": 20 },
    "cost": { "totalUsd": 0.00012 },
    "circuitJson": null
  }
  ```

## Scenario: 異なるモデルの利用量と実際の応答元を保持する

- Given 偽 Pi は応答モデル "other-model" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "provider": "fake-provider",
    "model": "other-model",
    "tokens": { "outputTokens": 20 },
    "cost": { "totalUsd": 0.00012 },
    "circuitJson": null
  }
  ```

## Scenario: 応答を得られなければ利用量を null にする

- Given 偽 Pi は1回目の課題呼び出しだけ失敗する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "tokens": {
      "inputTokens": null,
      "outputTokens": null,
      "cacheReadTokens": null,
      "cacheWriteTokens": null,
      "totalTokens": null
    },
    "cost": { "totalUsd": null }
  }
  ```

## Scenario: 利用量の一部が欠けても他の値を失わない

- Given 偽 Pi は停止理由 "error" とエラー "QNI_DUMMY_QUOTA" を返す
- Given 偽 Pi は出力トークン数を報告しない
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "tokens": { "inputTokens": 100, "outputTokens": null, "totalTokens": 125 },
    "cost": { "totalUsd": 0.00012 }
  }
  ```

## Scenario: 非ゼロ終了でも最終応答の利用量を保持する

- Given 偽 Pi は最終応答を返して終了コード 7 で終了する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しは次の部分 JSON を含む:

  ```json
  {
    "tokens": { "outputTokens": 20 },
    "cost": { "totalUsd": 0.00012 },
    "error": "Pi task failed with exit code 7"
  }
  ```

## Scenario: 非ゼロ終了の診断は非公開ファイルに保存する

- Given 偽 Pi は最終応答を返して終了コード 7 で終了する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then Pi の非ゼロ終了の診断は標準エラーに漏れず非公開で保持される

## Scenario: 準備確認の非ゼロ終了も非公開の診断だけを残す

- Given 偽 Pi は版確認で終了コード 7 を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then Pi の準備確認の診断は標準エラーに漏れず非公開で保持される

## Scenario: 外部 SIGTERM を時間切れと誤認しない

- Given 偽 Pi は自分に SIGTERM を送る
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug accounting" を実行
- Then 部分記録の最初の呼び出しエラーは "Pi task terminated by SIGTERM"
