# Feature: qni benchmark run

qni-cli の利用者として
課題ファイルと `.qni` 提出物を同じ条件で評価するために
qni benchmark run で最小の合格判定を実行したい。

## Scenario: StateFlip 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then コマンドは成功

## Scenario: StateFlip 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS StateFlip
  ```

## Scenario: StateFlip 評価は作業ディレクトリに circuit.json を残さない

- Given "circuit.json" は存在しない
- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then "circuit.json" は存在しない

## Scenario: StateFlip 標準解の JSON は passed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "passed"
  ```

## Scenario: StateFlip 標準解の JSON は終了コード 0 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 0
  ```

## Scenario: StateFlip 標準解の JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
    "status": "passed",
    "exitCode": 0,
    "checks": [
      {
        "type": "run",
        "status": "passed"
      }
    ]
  }
  ```

## Scenario: PlusState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then コマンドは成功

## Scenario: PlusState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS PlusState
  ```

## Scenario: BellState 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/bell-state.md" は存在する

## Scenario: BellState 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/bell-state.qni" は存在する

## Scenario: BellState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni" を実行
- Then コマンドは成功

## Scenario: BellState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BellState
  ```

## Scenario: BellState 標準解の JSON は expect 検証を含む

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "type": "expect"
  ```

## Scenario: StateFlip の不許可サンプルがある

- Then リポジトリファイル "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" は存在する

## Scenario: StateFlip の不許可コマンドは終了コード 2 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" を実行
- Then 終了コードは 2

## Scenario: StateFlip の不許可コマンドは拒否された行を表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" を実行
- Then 標準出力に次を含む:

  ```text
  DISALLOWED StateFlip
  rejected: line 1: qni run
  ```

## Scenario: StateFlip の不許可コマンドの JSON は disallowed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "disallowed"
  ```

## Scenario: StateFlip の不許可コマンドの JSON は終了コード 2 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 2
  ```

## Scenario: StateFlip の不許可コマンドの JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni",
    "status": "disallowed",
    "exitCode": 2,
    "checks": []
  }
  ```

## Scenario: StateFlip 不正解サンプルは終了コード 1 で不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: StateFlip 不正解サンプルは不合格と失敗したチェックを表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni" を実行
- Then 標準出力に次を含む:

  ```text
  FAIL StateFlip
  checks: 1
  failed checks:
  - run #1: state vector did not match expected amplitudes
    expected / actual mismatches:
    - |0>: expected 0, actual 0.7071067811865475
  ```

## Scenario: StateFlip 不正解サンプルの JSON は failed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "failed"
  ```

## Scenario: StateFlip 不正解サンプルの JSON は終了コード 1 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 1
  ```

## Scenario: StateFlip 不正解サンプルの JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni",
    "status": "failed",
    "exitCode": 1,
    "checks": [
      {
        "type": "run",
        "status": "failed"
      }
    ]
  }
  ```

## Scenario: frontmatter 不備の課題ファイルは終了コード 3 になる

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-missing-allowed-commands.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 終了コードは 3

## Scenario: frontmatter 不備の課題ファイルは error と表示される

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-missing-allowed-commands.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  ERROR benchmark run
  error: allowed_commands is required
  ```

## Scenario: YAML として壊れた課題ファイルは終了コード 3 になる

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-malformed-frontmatter.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 終了コードは 3

## Scenario: 提出物の構文不備は終了コード 3 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-syntax-error.qni" を実行
- Then 終了コードは 3

## Scenario: qni 実行失敗は終了コード 3 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni" を実行
- Then 終了コードは 3

## Scenario: qni 実行失敗は error と表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni" を実行
- Then 標準出力に次を含む:

  ```text
  ERROR StateFlip
  error: submission command failed at line 1: qni add X --qubit nope --step 0
  ```

## Scenario: qni 実行失敗の JSON は error を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "error"
  ```

## Scenario: qni 実行失敗の JSON は終了コード 3 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 3
  ```
