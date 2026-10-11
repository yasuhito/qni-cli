# Feature: Preparing Quantum States の回転を使う課題を採点する

上流 Verification.qs と同じゼロ入力を使い、全体位相を無視する。可変引数は固定する。

## Scenario: UnequalSuperposition の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/unequal-superposition.md benchmarks/solutions/quantum-katas/preparing-states/unequal-superposition.qni" を実行
- Then コマンドは成功

## Scenario: UnequalSuperposition の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/unequal-superposition.md benchmarks/solutions/quantum-katas/preparing-states/unequal-superposition-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: UnequalSuperposition の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/unequal-superposition.md benchmarks/incorrect/quantum-katas/preparing-states/unequal-superposition-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: ControlledRotation の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/controlled-rotation.md benchmarks/solutions/quantum-katas/preparing-states/controlled-rotation.qni" を実行
- Then コマンドは成功

## Scenario: ControlledRotation の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/controlled-rotation.md benchmarks/solutions/quantum-katas/preparing-states/controlled-rotation-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: ControlledRotation の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/controlled-rotation.md benchmarks/incorrect/quantum-katas/preparing-states/controlled-rotation-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: ThreeStatesTwoQubits の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits.md benchmarks/solutions/quantum-katas/preparing-states/three-states-two-qubits.qni" を実行
- Then コマンドは成功

## Scenario: ThreeStatesTwoQubits の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits.md benchmarks/solutions/quantum-katas/preparing-states/three-states-two-qubits-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: ThreeStatesTwoQubits の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits.md benchmarks/incorrect/quantum-katas/preparing-states/three-states-two-qubits-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: ThreeStatesTwoQubitsPhases の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits-phases.md benchmarks/solutions/quantum-katas/preparing-states/three-states-two-qubits-phases.qni" を実行
- Then コマンドは成功

## Scenario: ThreeStatesTwoQubitsPhases の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits-phases.md benchmarks/solutions/quantum-katas/preparing-states/three-states-two-qubits-phases-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: ThreeStatesTwoQubitsPhases の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/three-states-two-qubits-phases.md benchmarks/incorrect/quantum-katas/preparing-states/three-states-two-qubits-phases-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: HardyState の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/hardy-state.md benchmarks/solutions/quantum-katas/preparing-states/hardy-state.qni" を実行
- Then コマンドは成功

## Scenario: HardyState の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/hardy-state.md benchmarks/solutions/quantum-katas/preparing-states/hardy-state-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: HardyState の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/hardy-state.md benchmarks/incorrect/quantum-katas/preparing-states/hardy-state-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: WStatePowerOfTwo の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-power-of-two.md benchmarks/solutions/quantum-katas/preparing-states/wstate-power-of-two.qni" を実行
- Then コマンドは成功

## Scenario: WStatePowerOfTwo の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-power-of-two.md benchmarks/solutions/quantum-katas/preparing-states/wstate-power-of-two-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: WStatePowerOfTwo の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-power-of-two.md benchmarks/incorrect/quantum-katas/preparing-states/wstate-power-of-two-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: WStateArbitrary の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-arbitrary.md benchmarks/solutions/quantum-katas/preparing-states/wstate-arbitrary.qni" を実行
- Then コマンドは成功

## Scenario: WStateArbitrary の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-arbitrary.md benchmarks/solutions/quantum-katas/preparing-states/wstate-arbitrary-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: WStateArbitrary の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/wstate-arbitrary.md benchmarks/incorrect/quantum-katas/preparing-states/wstate-arbitrary-wrong.qni" を実行
- Then 終了コードは 1
