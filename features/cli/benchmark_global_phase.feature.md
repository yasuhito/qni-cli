# Feature: 状態準備のグローバル位相を無視する採点

## Scenario: 単一量子ビットの変換課題もグローバル位相を厳密に検証する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/global-phase-i.md benchmarks/incorrect/quantum-katas/single-qubit-gates/global-phase-i-minus-i.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL GlobalPhaseI
  ```

## Scenario: 状態準備ではグローバル位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS PlusState
  ```

## Scenario: 状態準備でも相対位相が異なる解は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/incorrect/quantum-katas/superposition/plus-state-relative-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL PlusState
  ```

## Scenario: Strict 課題ではグローバル位相だけの違いも不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL StateFlip
  ```
