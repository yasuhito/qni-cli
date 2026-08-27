# Feature: qni research compare 研究試行比較

qni-cli の利用者として
保存済み研究試行の差分を課題別に読むために
qni research compare で同じベンチマークの研究試行を比較したい。

## Scenario: 課題別マトリクスを表示する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-perfect" を研究ログに保存済み:

  ```json
  {
    "collaborator": "perfect-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 2, "total": 2, "percent": 100, "source": "result.json" }
  }
  ```

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-miss-one" を研究ログに保存済み:

  ```json
  {
    "collaborator": "miss-one-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "failed",
    "score": { "passed": 1, "total": 2, "percent": 50, "source": "result.json" }
  }
  ```

- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 標準出力に次を含む:

  ```text
  task-2  Task 2  failed
  ```

## Scenario: 差が出た課題を表示する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-perfect" を研究ログに保存済み:

  ```json
  {
    "collaborator": "perfect-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 2, "total": 2, "percent": 100, "source": "result.json" }
  }
  ```

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-miss-one" を研究ログに保存済み:

  ```json
  {
    "collaborator": "miss-one-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "failed",
    "score": { "passed": 1, "total": 2, "percent": 50, "source": "result.json" }
  }
  ```

- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 標準出力に次を含む:

  ```text
  task-2 Task 2: passed 1, failed 1
  ```

## Scenario: JSON で研究試行比較を出力する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-perfect" を研究ログに保存済み:

  ```json
  {
    "collaborator": "perfect-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 2, "total": 2, "percent": 100, "source": "result.json" }
  }
  ```

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-miss-one" を研究ログに保存済み:

  ```json
  {
    "collaborator": "miss-one-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "failed",
    "score": { "passed": 1, "total": 2, "percent": 50, "source": "result.json" }
  }
  ```

- When "qni research compare --benchmark benchmarks/quantum-katas --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "schemaVersion": 1,
    "benchmark": "benchmarks/quantum-katas",
    "exclusions": {
      "invalidTrial": 0,
      "benchmarkMismatch": 0,
      "missingOrInvalidResultDetails": 0,
      "taskSetMismatch": 0
    },
    "warnings": [],
    "trials": [
      {
        "id": "2026-07-02T000002Z-miss-one",
        "createdAt": "2026-07-02T00:00:02.000Z",
        "collaborator": "miss-one-agent",
        "benchmark": "benchmarks/quantum-katas",
        "status": "failed",
        "score": {
          "passed": 1,
          "total": 2,
          "percent": 50
        },
        "submissionProtocol": null,
        "path": "research/runs/2026-07-02T000002Z-miss-one"
      },
      {
        "id": "2026-07-02T000001Z-perfect",
        "createdAt": "2026-07-02T00:00:01.000Z",
        "collaborator": "perfect-agent",
        "benchmark": "benchmarks/quantum-katas",
        "status": "passed",
        "score": {
          "passed": 2,
          "total": 2,
          "percent": 100
        },
        "submissionProtocol": null,
        "path": "research/runs/2026-07-02T000001Z-perfect"
      }
    ],
    "tasks": [
      {
        "taskId": "task-1",
        "title": "Task 1",
        "results": [
          {
            "trialId": "2026-07-02T000002Z-miss-one",
            "status": "passed"
          },
          {
            "trialId": "2026-07-02T000001Z-perfect",
            "status": "passed"
          }
        ],
        "statusCounts": {
          "passed": 2,
          "failed": 0,
          "disallowed": 0,
          "error": 0,
          "missing": 0
        },
        "differs": false
      },
      {
        "taskId": "task-2",
        "title": "Task 2",
        "results": [
          {
            "trialId": "2026-07-02T000002Z-miss-one",
            "status": "failed"
          },
          {
            "trialId": "2026-07-02T000001Z-perfect",
            "status": "passed"
          }
        ],
        "statusCounts": {
          "passed": 1,
          "failed": 1,
          "disallowed": 0,
          "error": 0,
          "missing": 0
        },
        "differs": true
      }
    ],
    "differingTasks": [
      {
        "taskId": "task-2",
        "title": "Task 2",
        "results": [
          {
            "trialId": "2026-07-02T000002Z-miss-one",
            "status": "failed"
          },
          {
            "trialId": "2026-07-02T000001Z-perfect",
            "status": "passed"
          }
        ],
        "statusCounts": {
          "passed": 1,
          "failed": 1,
          "disallowed": 0,
          "error": 0,
          "missing": 0
        },
        "differs": true
      }
    ]
  }
  ```

## Scenario: 除外数を表示する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-perfect" を研究ログに保存済み:

  ```json
  {
    "collaborator": "perfect-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" }
  }
  ```

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-other-benchmark" を研究ログに保存済み:

  ```json
  {
    "collaborator": "other-model",
    "benchmark": "benchmarks/other-suite",
    "status": "passed",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" }
  }
  ```

- Given 比較に必要な結果が不正な研究試行 "2026-07-02T000003Z-bad-result" を研究ログに保存済み
- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 標準出力に次を含む:

  ```text
  Excluded trials:
    invalid trial: 1
    benchmark mismatch: 1
    task set mismatch: 0
    missing or invalid result details: 1
  ```

## Scenario: 提出プロトコル混在の注意を表示する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-legacy" を研究ログに保存済み:

  ```json
  {
    "collaborator": "legacy-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "submissionProtocol": "qni-command-output-v0",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" }
  }
  ```

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-neutral" を研究ログに保存済み:

  ```json
  {
    "collaborator": "neutral-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "submissionProtocol": "blind-neutral-circuit-json-v1",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" }
  }
  ```

- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 標準出力に次を含む:

  ```text
  mixed submission protocols: blind-neutral-circuit-json-v1, qni-command-output-v0
  ```

## Scenario: 無効な研究試行がある場合は終了コード 1 を返す

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 終了コードは 1

## Scenario: 研究試行ディレクトリは変更されない

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-perfect" を研究ログに保存済み:

  ```json
  {
    "collaborator": "perfect-agent",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" }
  }
  ```

- Given 研究ログの現在の内容を記録する
- When "qni research compare --benchmark benchmarks/quantum-katas" を実行
- Then 研究ログの内容は記録時点と一致する

## Scenario: compare help を表示する

- When "qni research compare --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni research compare --benchmark <dir> [--task <task-id> ...] [--json]
  ```

## Scenario: benchmark の値に json フラグを指定した場合は拒否する

- When "qni research compare --benchmark --json benchmarks/quantum-katas" を実行
- Then 標準エラーに次を含む:

  ```text
  Usage: qni research compare --benchmark <dir> [--task <task-id> ...] [--json]
  ```
