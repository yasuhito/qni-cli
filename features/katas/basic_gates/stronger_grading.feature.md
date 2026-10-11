# Feature: 既存 BasicGates 課題の厳密な採点

全入力の変換をグローバル位相も含めて検証し、一部の入力だけに合う誤答を不合格にする。

## Scenario: StateFlip の標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then コマンドは成功

## Scenario: StateFlip の Z の後に X を適用する誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-z-then-x.qni" を実行
- Then 終了コードは 1

## Scenario: StateFlip の X の後に Z を適用する誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-x-then-z.qni" を実行
- Then 終了コードは 1

## Scenario: StateFlip の Y を適用する誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-y.qni" を実行
- Then 終了コードは 1

## Scenario: FredkinGate の標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni" を実行
- Then コマンドは成功

## Scenario: FredkinGate の未検証の基底だけを変更する誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-untested-basis.qni" を実行
- Then 終了コードは 1

## Scenario: FredkinGate の一部の基底に位相を付ける誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-extra-phase.qni" を実行
- Then 終了コードは 1

## Scenario: FredkinGate の無条件 SWAP は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseChange の既存標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni" を実行
- Then コマンドは成功

## Scenario: GlobalPhaseChange の制御付き Pauli ゲートによる標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change-pauli.qni" を実行
- Then コマンドは成功

## Scenario: GlobalPhaseChange の位相を付けない誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-identity.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseChange の対象の一部だけに位相を付ける誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-controlled-z.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseChange の無条件に位相を付ける誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-unconditional.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseChange の角度が異なる誤答は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-wrong-angle.qni" を実行
- Then 終了コードは 1
