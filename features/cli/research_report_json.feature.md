# Feature: qni research report JSON

qni-cli の利用者として
保存済み研究試行を機械処理できるように
qni research report --json で集計済み JSON を出力したい。

## Scenario: 研究試行が無い場合も空の JSON レポートを出力する

- When "qni research report --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "schemaVersion": 1,
    "trialSummary": {
      "passed": 0,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "invalid": 0,
      "total": 0
    },
    "taskSummary": {
      "passed": 0,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "total": 0
    },
    "trials": []
  }
  ```

## Scenario: 研究試行が無い場合は成功する

- When "qni research report --json" を実行
- Then コマンドは成功

## Scenario: 有効な研究試行を集計する

- Given 有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
- When "qni research report --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "schemaVersion": 1,
    "trialSummary": {
      "passed": 1,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "invalid": 0,
      "total": 1
    },
    "taskSummary": {
      "passed": 1,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "total": 1
    },
    "trials": [
      {
        "id": "2026-06-30T123456Z-smoke-claude",
        "createdAt": "2026-06-30T12:34:56.000Z",
        "collaborator": "claude-sonnet-4",
        "benchmark": "benchmarks/quantum-katas",
        "status": "passed",
        "summary": {
          "passed": 1,
          "failed": 0,
          "disallowed": 0,
          "error": 0,
          "total": 1
        },
        "path": "research/runs/2026-06-30T123456Z-smoke-claude"
      }
    ]
  }
  ```

## Scenario: 無効な研究試行がある場合も JSON レポートを出力する

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research report --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "schemaVersion": 1,
    "trialSummary": {
      "passed": 0,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "invalid": 1,
      "total": 1
    },
    "taskSummary": {
      "passed": 0,
      "failed": 0,
      "disallowed": 0,
      "error": 0,
      "total": 0
    },
    "trials": [
      {
        "id": "broken-trial",
        "createdAt": null,
        "collaborator": null,
        "benchmark": null,
        "status": "invalid",
        "summary": {
          "passed": 0,
          "failed": 0,
          "disallowed": 0,
          "error": 0,
          "total": 0
        },
        "path": "research/runs/broken-trial",
        "invalidReason": [
          "invalid research trial id: broken-trial"
        ]
      }
    ]
  }
  ```

## Scenario: 無効な研究試行がある場合は終了コード 1 を返す

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research report --json" を実行
- Then 終了コードは 1
