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
