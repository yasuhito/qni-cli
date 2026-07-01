# Feature: qni research のヘルプ

qni-cli の利用者として
研究試行を記録する前に必要な入力と保存先を確認するために
qni research record のヘルプを見たい。

## Scenario: qni research record --help は成功する

- When "qni research record --help" を実行
- Then コマンドは成功

## Scenario: qni research record --help は必須入力を表示する

- When "qni research record --help" を実行
- Then 標準出力に次を含む:

  ```text
  Required inputs:
    --collaborator <name>
    --benchmark <dir>
    --submissions <dir>
    --prompt <file>
    --response <file>
    --slug <slug>
  ```

## Scenario: qni research record --help は保存されるファイルを表示する

- When "qni research record --help" を実行
- Then 標準出力に次を含む:

  ```text
  Saved files:
    research/runs/<timestamp>-<slug>/trial.md
    research/runs/<timestamp>-<slug>/metadata.json
    research/runs/<timestamp>-<slug>/prompt.md
    research/runs/<timestamp>-<slug>/response.md
    research/runs/<timestamp>-<slug>/submissions/
    research/runs/<timestamp>-<slug>/result.json
  ```

## Scenario: qni research record --help は終了コードの意味を表示する

- When "qni research record --help" を実行
- Then 標準出力に次を含む:

  ```text
  Exit codes:
    0  passed
    1  failed
    2  disallowed
    3  error or input/save failure
  ```

## Scenario: qni research --help は成功する

- When "qni research --help" を実行
- Then コマンドは成功

## Scenario: qni research --help は record コマンドを案内する

- When "qni research --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni research record
  ```

## Scenario: qni research --help は report コマンドを案内する

- When "qni research --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni research report
  ```

## Scenario: qni research report --help は成功する

- When "qni research report --help" を実行
- Then コマンドは成功

## Scenario: qni research report --help は使い方を表示する

- When "qni research report --help" を実行
- Then 標準出力に次を含む:

  ```text
  Usage:
    qni research report [--json]
  ```

## Scenario: qni research report --help は対象ディレクトリを表示する

- When "qni research report --help" を実行
- Then 標準出力に次を含む:

  ```text
  research/runs/
  ```

## Scenario: qni research report --help は JSON 出力を表示する

- When "qni research report --help" を実行
- Then 標準出力に次を含む:

  ```text
  --json
  ```

## Scenario: qni research report --help は終了コードを表示する

- When "qni research report --help" を実行
- Then 標準出力に次を含む:

  ```text
  Exit codes:
    0  report generated and no invalid research trials were found
    1  report generated and one or more invalid research trials were found
    3  research/runs/ could not be read
  ```
