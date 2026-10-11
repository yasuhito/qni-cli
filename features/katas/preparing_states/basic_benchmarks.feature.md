# Feature: Preparing Quantum States の回転不要課題を固定値で採点する

上流 Verification.qs と同じゼロ入力を使い、全体位相を無視する。q0 は基底表記の左端とする。

## Scenario: AllBellStates0 の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-0.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-0.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates0 の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-0.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-0-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates0 の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-0.md benchmarks/incorrect/quantum-katas/preparing-states/all-bell-states-0-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: AllBellStates1 の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-1.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-1.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates1 の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-1.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-1-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates1 の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-1.md benchmarks/incorrect/quantum-katas/preparing-states/all-bell-states-1-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: AllBellStates2 の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-2.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-2.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates2 の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-2.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-2-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates2 の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-2.md benchmarks/incorrect/quantum-katas/preparing-states/all-bell-states-2-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: AllBellStates3 の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-3.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-3.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates3 の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-3.md benchmarks/solutions/quantum-katas/preparing-states/all-bell-states-3-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: AllBellStates3 の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-bell-states-3.md benchmarks/incorrect/quantum-katas/preparing-states/all-bell-states-3-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: AllBasisVectors の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-basis-vectors.md benchmarks/solutions/quantum-katas/preparing-states/all-basis-vectors.qni" を実行
- Then コマンドは成功

## Scenario: AllBasisVectors の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-basis-vectors.md benchmarks/solutions/quantum-katas/preparing-states/all-basis-vectors-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: AllBasisVectors の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/all-basis-vectors.md benchmarks/incorrect/quantum-katas/preparing-states/all-basis-vectors-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: EvenOdd の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/even-odd.md benchmarks/solutions/quantum-katas/preparing-states/even-odd.qni" を実行
- Then コマンドは成功

## Scenario: EvenOdd の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/even-odd.md benchmarks/solutions/quantum-katas/preparing-states/even-odd-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: EvenOdd の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/even-odd.md benchmarks/incorrect/quantum-katas/preparing-states/even-odd-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: ZeroAndBitstring の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/zero-and-bitstring.md benchmarks/solutions/quantum-katas/preparing-states/zero-and-bitstring.qni" を実行
- Then コマンドは成功

## Scenario: ZeroAndBitstring の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/zero-and-bitstring.md benchmarks/solutions/quantum-katas/preparing-states/zero-and-bitstring-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: ZeroAndBitstring の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/zero-and-bitstring.md benchmarks/incorrect/quantum-katas/preparing-states/zero-and-bitstring-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: TwoBitstrings の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/two-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/two-bitstrings.qni" を実行
- Then コマンドは成功

## Scenario: TwoBitstrings の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/two-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/two-bitstrings-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: TwoBitstrings の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/two-bitstrings.md benchmarks/incorrect/quantum-katas/preparing-states/two-bitstrings-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: FourBitstrings の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/four-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/four-bitstrings.qni" を実行
- Then コマンドは成功

## Scenario: FourBitstrings の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/four-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/four-bitstrings-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: FourBitstrings の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/four-bitstrings.md benchmarks/incorrect/quantum-katas/preparing-states/four-bitstrings-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: ParityBitstrings の標準解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/parity-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/parity-bitstrings.qni" を実行
- Then コマンドは成功

## Scenario: ParityBitstrings の全体位相だけが異なる解を合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/parity-bitstrings.md benchmarks/solutions/quantum-katas/preparing-states/parity-bitstrings-global-phase.qni" を実行
- Then コマンドは成功

## Scenario: ParityBitstrings の異なる状態を不合格にする

- When "qni benchmark run benchmarks/quantum-katas/preparing-states/parity-bitstrings.md benchmarks/incorrect/quantum-katas/preparing-states/parity-bitstrings-wrong.qni" を実行
- Then 終了コードは 1
