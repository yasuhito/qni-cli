# Feature: qni research record score metadata

qni-cli の利用者として
保存済み研究試行を後で比較できるように
qni research record が採点結果から課題単位の score を保存してほしい。

## Background:

- Given 作業ディレクトリに "prompt.md" を作る:

  ```md
  Quantum Katas のスモークセットを `.qni` 形式で解いてください。
  ```

- Given 作業ディレクトリに "response.md" を作る:

  ```md
  提出物ディレクトリに各課題の `.qni` ファイルを保存しました。
  ```

## Scenario: 合格した研究試行のメタデータに score を保存する

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "score" は次の JSON と一致する:

  ```json
  {
    "passed": 22,
    "total": 22,
    "percent": 100,
    "source": "result.json"
  }
  ```

## Scenario Outline: 不成功の研究試行のメタデータにも score を保存する

- Given 作業ディレクトリに採点状態 "<status>" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug <status>-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "score" は次の JSON と一致する:

  ```json
  {
    "passed": 21,
    "total": 22,
    "percent": 95.45454545454545,
    "source": "result.json"
  }
  ```

### Examples:

  | status     |
  | failed     |
  | disallowed |
  | error      |

## Scenario: 研究試行要約に score の浅い要約を表示する

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "trial.md" は "- score: 100.00%" を含む

## Scenario: score がある研究試行でも人間向け研究試行レポートは従来どおり読める

- Given score を持つ有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
- When "qni research report" を実行
- Then 標準出力の内容:

  ```text
  Research trial report
  Research runs: research/runs

  Trial summary:
    total: 1
    passed: 1
    failed: 0
    disallowed: 0
    error: 0
    invalid: 0

  Task summary:
    total: 1
    passed: 1
    failed: 0
    disallowed: 0
    error: 0

  Trials:
    status       tasks  id
    passed       1/1    2026-06-30T123456Z-smoke-claude
      collaborator: claude-sonnet-4
      benchmark: benchmarks/quantum-katas
      path: research/runs/2026-06-30T123456Z-smoke-claude
  ```

## Scenario: score がある研究試行でも JSON 研究試行レポートは従来どおり読める

- Given score を持つ有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
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

## Scenario: score が無い既存の研究試行を自動で書き換えない

- Given 有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
- When "qni research report" を実行
- Then 研究試行 "2026-06-30T123456Z-smoke-claude" のメタデータ JSON は "score" を含まない
