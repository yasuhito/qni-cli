# Feature: Single-Qubit Gates の厳密採点ベンチマーク

各課題は |0>、|1>、|+> 入力の振幅をグローバル位相も含めて検証する。

## Scenario: YGate の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/y-gate.md benchmarks/solutions/quantum-katas/single-qubit-gates/y-gate.qni" を実行
- Then コマンドは成功

## Scenario: YGate の wrong-operation を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/y-gate.md benchmarks/incorrect/quantum-katas/single-qubit-gates/y-gate-wrong-operation.qni" を実行
- Then 終了コードは 1

## Scenario: YGate の wrong-global-phase を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/y-gate.md benchmarks/incorrect/quantum-katas/single-qubit-gates/y-gate-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: SignFlipOnZero の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/sign-flip-on-zero.md benchmarks/solutions/quantum-katas/single-qubit-gates/sign-flip-on-zero.qni" を実行
- Then コマンドは成功

## Scenario: SignFlipOnZero の wrong-operation を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/sign-flip-on-zero.md benchmarks/incorrect/quantum-katas/single-qubit-gates/sign-flip-on-zero-wrong-operation.qni" を実行
- Then 終了コードは 1

## Scenario: SignFlipOnZero の wrong-global-phase を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/sign-flip-on-zero.md benchmarks/incorrect/quantum-katas/single-qubit-gates/sign-flip-on-zero-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseI の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/global-phase-i.md benchmarks/solutions/quantum-katas/single-qubit-gates/global-phase-i.qni" を実行
- Then コマンドは成功

## Scenario: GlobalPhaseI の wrong-operation を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/global-phase-i.md benchmarks/incorrect/quantum-katas/single-qubit-gates/global-phase-i-wrong-operation.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseI の wrong-global-phase を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/global-phase-i.md benchmarks/incorrect/quantum-katas/single-qubit-gates/global-phase-i-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareMinus の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-minus.md benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-minus.qni" を実行
- Then コマンドは成功

## Scenario: PrepareMinus の wrong-operation を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-minus.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-minus-wrong-operation.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareMinus の wrong-global-phase を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-minus.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-minus-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: ThreeQuartersPiPhase の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/three-quarters-pi-phase.md benchmarks/solutions/quantum-katas/single-qubit-gates/three-quarters-pi-phase.qni" を実行
- Then コマンドは成功

## Scenario: ThreeQuartersPiPhase の wrong-operation を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/three-quarters-pi-phase.md benchmarks/incorrect/quantum-katas/single-qubit-gates/three-quarters-pi-phase-wrong-operation.qni" を実行
- Then 終了コードは 1

## Scenario: ThreeQuartersPiPhase の wrong-global-phase を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/three-quarters-pi-phase.md benchmarks/incorrect/quantum-katas/single-qubit-gates/three-quarters-pi-phase-wrong-global-phase.qni" を実行
- Then 終了コードは 1
