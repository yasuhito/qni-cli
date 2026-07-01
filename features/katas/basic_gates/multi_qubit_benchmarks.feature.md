# Feature: Quantum Katas BasicGates Part II ベンチマーク

qni-cli のベンチマーク利用者として、Quantum Katas BasicGates Part II の多量子ビット課題を
既存の `qni add` と複数採点ケースで評価したい。

## Scenario: TwoQubitGate1 標準解は複数入力で合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-1.qni" を実行
- Then コマンドは成功

## Scenario: TwoQubitGate2 標準解は複数入力で合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-2.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-2.qni" を実行
- Then コマンドは成功

## Scenario: TwoQubitGate3 標準解は複数入力で合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-3.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-3.qni" を実行
- Then コマンドは成功

## Scenario: TwoQubitGate4 標準解は複数入力で合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-4.md benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-4.qni" を実行
- Then コマンドは成功

## Scenario: ToffoliGate 標準解は複数入力で合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/toffoli-gate.md benchmarks/solutions/quantum-katas/basic-gates/toffoli-gate.qni" を実行
- Then コマンドは成功

## Scenario: TwoQubitGate1 の片方の入力だけに合う不正解サンプルは不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md benchmarks/incorrect/quantum-katas/basic-gates/two-qubit-gate-1-zero-only.qni" を実行
- Then 終了コードは 1

## Scenario: Quantum Katas スモークセットは BasicGates Part II を含めて一括実行できる

- When "qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas" を実行
- Then コマンドは成功
