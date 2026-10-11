# Feature: Single-Qubit Gates の残り3問を固定値で厳密採点する

上流の Verification.qs に従い、グローバル位相を含めて振幅を比較する。
AmplitudeChange は α=π/6 で |0>、|1>、|+> の変換を検証する。
PrepareRotatedState は α=-√3/2、β=1/2、PrepareArbitraryState は α=1/2、β=√3/2、θ=π/3 とし、上流と同じゼロ入力のみを検証する。

## Scenario: AmplitudeChange の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/amplitude-change.md benchmarks/solutions/quantum-katas/single-qubit-gates/amplitude-change.qni" を実行
- Then コマンドは成功

## Scenario: AmplitudeChange の角度半減を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/amplitude-change.md benchmarks/incorrect/quantum-katas/single-qubit-gates/amplitude-change-wrong-angle.qni" を実行
- Then 終了コードは 1

## Scenario: AmplitudeChange のグローバル位相違いを不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/amplitude-change.md benchmarks/incorrect/quantum-katas/single-qubit-gates/amplitude-change-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareRotatedState の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-rotated-state.md benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-rotated-state.qni" を実行
- Then コマンドは成功

## Scenario: PrepareRotatedState の回転軸違いを不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-rotated-state.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-rotated-state-wrong-axis.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareRotatedState のグローバル位相違いを不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-rotated-state.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-rotated-state-wrong-global-phase.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareArbitraryState の標準解が合格する

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-arbitrary-state.md benchmarks/solutions/quantum-katas/single-qubit-gates/prepare-arbitrary-state.qni" を実行
- Then コマンドは成功

## Scenario: PrepareArbitraryState の相対位相欠落を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-arbitrary-state.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-arbitrary-state-missing-phase.qni" を実行
- Then 終了コードは 1

## Scenario: PrepareArbitraryState の P を Rz に置き換えた位相違いを不合格にする

- When "qni benchmark run benchmarks/quantum-katas/single-qubit-gates/prepare-arbitrary-state.md benchmarks/incorrect/quantum-katas/single-qubit-gates/prepare-arbitrary-state-wrong-global-phase.qni" を実行
- Then 終了コードは 1
