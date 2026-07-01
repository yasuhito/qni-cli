# Feature: qni research report human-readable output

qni-cli の利用者として
保存済み研究試行の状況をターミナルで読むために
qni research report で人間向けレポートを表示したい。

## Scenario: 研究試行が無い場合も summary を表示する

- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
  Trial summary:
    total: 0
    passed: 0
    failed: 0
    disallowed: 0
    error: 0
    invalid: 0
  ```

## Scenario: 研究試行が無い場合は見つからないことを表示する

- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
  No research trials found.
  ```

## Scenario: 研究試行が無い場合は成功する

- When "qni research report" を実行
- Then コマンドは成功

## Scenario: 課題単位 summary を表示する

- Given 有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
  Task summary:
    total: 1
    passed: 1
    failed: 0
    disallowed: 0
    error: 0
  ```

## Scenario: 研究試行一覧は新しい順で表示する

- Given 有効な研究試行 "2026-06-30T123456Z-older" を研究ログに保存済み
- Given 有効な研究試行 "2026-07-01T000001Z-newer" を研究ログに保存済み
- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
  Trials:
    status       tasks  id
    passed       1/1    2026-07-01T000001Z-newer
      collaborator: claude-sonnet-4
      benchmark: benchmarks/quantum-katas
      path: research/runs/2026-07-01T000001Z-newer
    passed       1/1    2026-06-30T123456Z-older
  ```

## Scenario: 研究試行一覧の status は lowercase で表示する

- Given 有効な研究試行 "2026-06-30T123456Z-passed" を研究ログに保存済み
- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
    invalid      -      broken-trial
  ```

## Scenario: 無効な研究試行の理由は details に表示する

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research report" を実行
- Then 標準出力に次を含む:

  ```text
  Invalid details:
    broken-trial
      - invalid research trial id: broken-trial
  ```

## Scenario: 無効な研究試行がある場合は終了コード 1 を返す

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When "qni research report" を実行
- Then 終了コードは 1
