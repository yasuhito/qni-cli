# Feature: qni benchmark grading case output

qni-cli の評価ランナー利用者として
複数の採点ケースを持つ課題の失敗箇所を調査できるように
ケース ID と検証条件種別を出力から追跡したい。

## Scenario: 複数採点ケースの JSON 出力で case ID を確認できる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: grading-cases/x-on-zero-and-one
  title: XOnZeroAndOne
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: zero-input
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
    - id: one-input
      setup_commands:
        - qni state set "|1>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  片方の採点ケースだけが失敗する課題です。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "caseId": "one-input"
  ```

## Scenario: 複数採点ケースの人間向け出力で失敗 case ID と検証条件種別を確認できる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: grading-cases/x-on-zero-and-one
  title: XOnZeroAndOne
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: zero-input
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
    - id: one-input
      setup_commands:
        - qni state set "|1>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  片方の採点ケースだけが失敗する課題です。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 標準出力に次を含む:

  ```text
  - case one-input run #1: state vector did not match expected amplitudes
  ```

## Scenario: run-all の JSON 出力でもケース別結果を確認できる

- Given 作業ディレクトリに "benchmarks/grading-cases/x-on-zero-and-one.md" を作る:

  ```markdown
  ---
  id: grading-cases/x-on-zero-and-one
  title: XOnZeroAndOne
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: zero-input
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
    - id: one-input
      setup_commands:
        - qni state set "|1>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  片方の採点ケースだけが失敗する課題です。
  ```

- Given 作業ディレクトリに "solutions/grading-cases/x-on-zero-and-one.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run-all benchmarks solutions --json" を実行
- Then 標準出力に次を含む:

  ```text
  "caseId": "one-input"
  ```

## Scenario: run-all の人間向け出力でも失敗 case ID と検証条件種別を確認できる

- Given 作業ディレクトリに "benchmarks/grading-cases/x-on-zero-and-one.md" を作る:

  ```markdown
  ---
  id: grading-cases/x-on-zero-and-one
  title: XOnZeroAndOne
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: zero-input
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
    - id: one-input
      setup_commands:
        - qni state set "|1>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|1>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  片方の採点ケースだけが失敗する課題です。
  ```

- Given 作業ディレクトリに "solutions/grading-cases/x-on-zero-and-one.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run-all benchmarks solutions" を実行
- Then 標準出力に次を含む:

  ```text
  - case one-input run #1: failed
  ```
