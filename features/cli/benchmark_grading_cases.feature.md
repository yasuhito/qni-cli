# Feature: qni benchmark grading cases

qni-cli の評価ランナー利用者として
複数の採点ケースを含む課題へ移行できるように
課題 frontmatter の採点ケース仕様を読み込み時に検証したい。

## Scenario: checks と grading_cases を同時に持つ課題は不正になる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: grading-cases/conflict
  title: GradingCasesConflict
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: run
        expected:
          - basis: "|1>"
            amplitude:
              real: 1
              imaginary: 0
  grading_cases:
    - id: default
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

  checks と grading_cases を同時指定した不正な課題です。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 終了コードは 3

## Scenario: 複数の採点ケースをすべて合格できる

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
              - basis: "|0>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  X 回路を複数の入力で採点する課題です。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then コマンドは成功

## Scenario: いずれかの採点ケースが失敗すると不合格になる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: grading-cases/one-case-fails
  title: OneCaseFails
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
- Then 終了コードは 1

## Scenario: setup_commands の失敗は実行エラーになる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: grading-cases/setup-error
  title: SetupError
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: bad-setup
      setup_commands:
        - qni state set ""
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|0>"
                amplitude:
                  real: 1
                  imaginary: 0
  ---

  setup_commands が失敗する課題です。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text

  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 終了コードは 3
