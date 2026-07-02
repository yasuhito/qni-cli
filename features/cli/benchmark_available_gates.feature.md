# Feature: ベンチマーク課題の中立ゲート語彙

qni-cli のベンチマーク作成者として
採点用の内部情報を課題本文から分離するために
課題 frontmatter で中立ゲート語彙を検証したい。

## Scenario: available_gates が欠けた課題は不正になる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: neutral-gates/missing
  title: MissingAvailableGates
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
  ---

  1量子ビットを |0> から |1> に変える量子回路を設計してください。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 終了コードは 3

## Scenario: available_gates が空の課題は不正になる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: neutral-gates/empty
  title: EmptyAvailableGates
  source: test
  difficulty: smoke
  available_gates: []
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
  ---

  1量子ビットを |0> から |1> に変える量子回路を設計してください。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 終了コードは 3

## Scenario: available_gates の項目が文字列でない課題は不正になる

- Given 作業ディレクトリに "task.md" を作る:

  ```markdown
  ---
  id: neutral-gates/non-string
  title: NonStringAvailableGates
  source: test
  difficulty: smoke
  available_gates:
    - X(target)
    - 42
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
  ---

  1量子ビットを |0> から |1> に変える量子回路を設計してください。
  ```

- Given 作業ディレクトリに "submission.qni" を作る:

  ```text
  qni add X --qubit 0 --step 0
  ```

- When "qni benchmark run task.md submission.qni" を実行
- Then 終了コードは 3

## Scenario: Quantum Katas 全課題は中立ゲート語彙を持つ

- Then Quantum Katas 課題はすべて available_gates を持つ

## Scenario: Quantum Katas 課題本文は qni-cli 固有表現を含まない

- Then Quantum Katas 課題本文は qni-cli 固有表現を含まない
