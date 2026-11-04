# Feature: 空の提出物を課題の量子ビット数の恒等回路として採点する

評価ランナーの利用者として
中立回路 JSON の空の操作列を内部エラーにせず
課題の検証条件が指定する幅の恒等回路として採点したい。

## Background:

- Given 作業ディレクトリに "empty.qni" を作る:

  ```text

  ```

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: unitary
        reference_circuit:
          qubits: 2
          cols: []
  ---

  2量子ビットの恒等変換を作ってください。
  ```

## Scenario: 2量子ビットの参照回路に空の恒等回路が合格する

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: 1量子ビットの参照回路に空の恒等回路が合格する

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: unitary
        reference_circuit:
          qubits: 1
          cols: []
  ---

  1量子ビットの恒等変換を作ってください。
  ```

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: 3量子ビットの参照回路に空の恒等回路が合格する

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: unitary
        reference_circuit:
          qubits: 3
          cols: []
  ---

  3量子ビットの恒等変換を作ってください。
  ```

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: 目標が恒等変換でない空の提出物は実行エラーでなく不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md empty.qni" を実行
- Then 終了コードは 1

## Scenario: 初期状態を指定した空の提出物はその状態を保持する

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  grading_cases:
    - id: prepared
      setup_commands:
        - qni state set "0.6|00> + 0.8|10>"
      checks:
        tolerance: 1e-9
        items:
          - type: run
            expected:
              - basis: "|00>"
                amplitude: { real: 0.6, imaginary: 0 }
              - basis: "|10>"
                amplitude: { real: 0.8, imaginary: 0 }
          - type: unitary
            reference_circuit:
              qubits: 2
              cols: []
  ---

  入力状態を変えないでください。
  ```

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: 状態ベクトルの基底が指定する幅で空の回路を採点する

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: run
        expected:
          - basis: "|000>"
            amplitude: { real: 1, imaginary: 0 }
  ---

  3量子ビットのゼロ状態を保持してください。
  ```

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: Pauli 文字列が指定する幅で空の回路を採点する

- Given 作業ディレクトリに "benchmark/identity.md" を作る:

  ```md
  ---
  id: empty/identity
  title: Empty identity
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: expect
        expected:
          - pauli: ZZZ
            value: 1
  ---

  3量子ビットのゼロ状態を保持してください。
  ```

- When "qni benchmark run benchmark/identity.md empty.qni" を実行
- Then コマンドは成功

## Scenario: 通常の空でない提出物の採点は変わらない

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then コマンドは成功

## Scenario: 道具を使わない偽モデルの空の操作列も正しい恒等回路として記録する

- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する
- Given 偽 Pi は次の最終回答を返す:

  ```json
  { "operations": [] }
  ```

- When "qni research solve --model fake-qni --thinking high --benchmark benchmark --slug empty-identity" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "passed"

## Scenario: 道具を使わない偽モデルの誤った空の操作列は不合格として記録する

- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する
- Given 偽 Pi は次の最終回答を返す:

  ```json
  { "operations": [] }
  ```

- When "qni research solve --model fake-qni --thinking high --benchmark benchmarks/quantum-katas --task basic-gates/two-qubit-gate-1 --slug empty-wrong" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "failed"
