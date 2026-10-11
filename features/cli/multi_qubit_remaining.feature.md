# Feature: Multi-Qubit Gates の残り四課題を採点する

## Scenario: CompoundGate の標準解を受理する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/compound-gate.md benchmarks/solutions/quantum-katas/multi-qubit-gates/compound-gate.qni" を実行
- Then コマンドは成功

## Scenario: CompoundGate の X による代用を拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/compound-gate.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/compound-gate-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: CompoundGate の全体位相違いを拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/compound-gate.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/compound-gate-phase-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: PreparingBellState の標準解を受理する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/preparing-bell-state.md benchmarks/solutions/quantum-katas/multi-qubit-gates/preparing-bell-state.qni" を実行
- Then コマンドは成功

## Scenario: PreparingBellState の相対位相違いを拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/preparing-bell-state.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/preparing-bell-state-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: PreparingBellState の全体位相違いを受理する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/preparing-bell-state.md benchmarks/solutions/quantum-katas/multi-qubit-gates/preparing-bell-state-phase.qni" を実行
- Then コマンドは成功

## Scenario: ControlledRotation の標準解を受理する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/controlled-rotation.md benchmarks/solutions/quantum-katas/multi-qubit-gates/controlled-rotation.qni" を実行
- Then コマンドは成功

## Scenario: ControlledRotation の無制御回転を拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/controlled-rotation.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/controlled-rotation-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: ControlledRotation の制御部分だけの位相違いを拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/controlled-rotation.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/controlled-rotation-phase-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: ArbitraryControls の標準解を受理する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/arbitrary-controls.md benchmarks/solutions/quantum-katas/multi-qubit-gates/arbitrary-controls.qni" を実行
- Then コマンドは成功

## Scenario: ArbitraryControls の正制御だけの回路を拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/arbitrary-controls.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/arbitrary-controls-wrong.qni" を実行
- Then コマンドは失敗

## Scenario: ArbitraryControls の反制御復元漏れを拒否する

- When "qni benchmark run benchmarks/quantum-katas/multi-qubit-gates/arbitrary-controls.md benchmarks/incorrect/quantum-katas/multi-qubit-gates/arbitrary-controls-restore-wrong.qni" を実行
- Then コマンドは失敗
