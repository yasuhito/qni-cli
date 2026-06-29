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

## Scenario: PlusState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then コマンドは成功

## Scenario: PlusState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS PlusState
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
  ```
