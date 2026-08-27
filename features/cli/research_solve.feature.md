# Feature: qni research solve を Pi 経由で実行する

qni-cli の利用者として
モデルへ qni-cli 固有の提出形式や作業場所を見せずに課題を解かせるために
問題ごとに隔離した Pi を呼び、中立回路 JSON を採点して研究試行へ保存したい。

## Background:

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する
- Given 偽 Pi は次の最終回答を返す:

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

## Scenario: Pi の中立回路 JSON で選択した課題を研究試行として保存する

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then コマンドは成功

## Scenario: 選択した課題だけが採点される

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 研究試行の score 分母は 1

## Scenario: Pi のモデルと思考量と版を保存する

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  {
    "taskSelection": ["smoke/state-flip"],
    "model": {
      "id": "fake-qni",
      "provider": "fake-provider"
    },
    "generation": {
      "thinking": "max"
    },
    "pi": {
      "version": "9.9.9"
    },
    "tokens": {
      "inputTokens": 100,
      "outputTokens": 20,
      "cacheReadTokens": 5,
      "cacheWriteTokens": 0,
      "totalTokens": 125,
      "source": "pi_usage"
    },
    "cost": {
      "totalUsd": 0.00012,
      "perProblemUsd": 0.00012,
      "source": "pi_usage"
    }
  }
  ```

## Scenario: Pi は課題ごとの空の作業場所で道具や文脈なしに実行される

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 偽 Pi の課題呼び出しは隔離オプションをすべて含む

## Scenario: モデルが利用できない場合は研究試行を作らない

- Given 偽 Pi はモデル "fake-qni" を利用不可として報告する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 終了コードは 3

## Scenario: モデルが利用できない場合は研究試行ディレクトリを作らない

- Given 偽 Pi はモデル "fake-qni" を利用不可として報告する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: thinking を省略すると入力エラーになる

- When "qni research solve --model fake-qni --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 終了コードは 3

## Scenario: 未知の課題を選ぶと研究試行を作らない

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/missing --slug fake-pi" を実行
- Then 終了コードは 3

## Scenario: JSON 形式違反の最終回答は disallowed として保存する

- Given 偽 Pi は最終回答 "これは JSON ではありません" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 終了コードは 2

## Scenario: 指定モデルと応答モデルが異なる課題は error として保存する

- Given 偽 Pi は応答モデル "other-model" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug fake-pi" を実行
- Then 研究試行 JSON ファイル "result.json" は次の部分 JSON を含む:

  ```json
  {
    "status": "error",
    "summary": {
      "total": 1,
      "error": 1
    }
  }
  ```

## Scenario: 1課題の Pi 実行失敗後も残りを実行して error を保存する

- Given 偽 Pi は1回目の課題呼び出しだけ失敗する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug fake-pi" を実行
- Then 研究試行 JSON ファイル "result.json" は次の部分 JSON を含む:

  ```json
  {
    "status": "error",
    "summary": {
      "total": 2,
      "passed": 1,
      "error": 1
    }
  }
  ```
