# Feature: qni research plot cost per problem と score

qni-cli の利用者として
保存済み研究試行のモデル別コストと成績を比較するために
qni research plot で自己完結 HTML の散布図を作成したい。

## Scenario: cost per problem と score の自己完結 HTML を作成する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "model": { "registryId": "gpt-4.1-mini" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output research/plots/cost-vs-score.html" を実行
- Then 作業ディレクトリのファイル "research/plots/cost-vs-score.html" は自己完結 HTML の研究散布図である

## Scenario: 指定したベンチマークの有効な研究試行を点として含める

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "model": { "registryId": "gpt-4.1-mini" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は "data-trial-id=\"2026-07-02T000001Z-gpt-4-1-mini\"" を含む

## Scenario: 軸は cost per problem と score percent の線形スケールを示す

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は "Cost per problem (USD, linear)" を含む

## Scenario: 点のラベルはモデル登録IDを優先する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "共同研究者名",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "model": { "registryId": "gpt-4.1-mini" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は "gpt-4.1-mini" を含む

## Scenario: モデル登録IDが無い場合は共同研究者名をラベルに使う

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-human" を研究ログに保存済み:

  ```json
  {
    "collaborator": "human-researcher",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "source": "provider_usage" },
    "cost": { "totalUsd": 0, "perProblemUsd": 0, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は "human-researcher" を含む

## Scenario: 点の詳細を HTML 内で確認できる

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "failed",
    "score": { "passed": 21, "total": 22, "percent": 95.45454545454545, "source": "result.json" },
    "model": { "registryId": "gpt-4.1-mini" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は次を含む:

  ```html
  <td><code>2026-07-02T000001Z-gpt-4-1-mini</code></td>
  <td><code>benchmarks/quantum-katas</code></td>
  <td>failed</td>
  <td>21/22</td>
  <td>input 12345, output 6789, total 19134</td>
  ```

## Scenario: 除外数を HTML に表示する

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- Given cost 指標を持つ有効な研究試行 "2026-07-02T000002Z-other-benchmark" を研究ログに保存済み:

  ```json
  {
    "collaborator": "other-model",
    "benchmark": "benchmarks/other-suite",
    "status": "passed",
    "score": { "passed": 1, "total": 1, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 1, "outputTokens": 1, "totalTokens": 2, "source": "provider_usage" },
    "cost": { "totalUsd": 0.01, "perProblemUsd": 0.01, "source": "estimated_from_model_registry" }
  }
  ```

- Given cost 指標が不正な研究試行 "2026-07-02T000003Z-missing-cost" を研究ログに保存済み
- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 作業ディレクトリのファイル "plot.html" は次を含む:

  ```html
  <li>invalid trial: 1</li>
  <li>benchmark mismatch: 1</li>
  <li>missing or invalid metrics: 1</li>
  ```

## Scenario: 既存 HTML は上書きされる

- Given 作業ディレクトリに "research/plots/cost-vs-score.html" を作る:

  ```html
  old plot
  ```

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- When "qni research plot --benchmark benchmarks/quantum-katas --output research/plots/cost-vs-score.html" を実行
- Then 作業ディレクトリのファイル "research/plots/cost-vs-score.html" は "old plot" を含まない

## Scenario: 研究試行ディレクトリは変更されない

- Given cost 指標を持つ有効な研究試行 "2026-07-02T000001Z-gpt-4-1-mini" を研究ログに保存済み:

  ```json
  {
    "collaborator": "gpt-4.1-mini",
    "benchmark": "benchmarks/quantum-katas",
    "status": "passed",
    "score": { "passed": 22, "total": 22, "percent": 100, "source": "result.json" },
    "tokens": { "inputTokens": 12345, "outputTokens": 6789, "totalTokens": 19134, "source": "provider_usage" },
    "cost": { "totalUsd": 0.1234, "perProblemUsd": 0.005609090909090909, "source": "estimated_from_model_registry" }
  }
  ```

- Given 研究ログの現在の内容を記録する
- When "qni research plot --benchmark benchmarks/quantum-katas --output plot.html" を実行
- Then 研究ログの内容は記録時点と一致する
