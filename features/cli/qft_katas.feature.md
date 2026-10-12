# Feature: QFT の12課題を固定値で採点する

## Scenario: QFTSingleQubit の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/single-qubit.md benchmarks/solutions/quantum-katas/qft/single-qubit.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTSingleQubit
  ```

## Scenario: QFTSingleQubit の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/single-qubit.md benchmarks/incorrect/quantum-katas/qft/single-qubit-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTSingleQubit
  ```

## Scenario: QFTSingleQubit の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/single-qubit.md benchmarks/incorrect/quantum-katas/qft/single-qubit-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTSingleQubit
  ```

## Scenario: QFTRotationGate の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/rotation-gate.md benchmarks/solutions/quantum-katas/qft/rotation-gate.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTRotationGate
  ```

## Scenario: QFTRotationGate の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/rotation-gate.md benchmarks/incorrect/quantum-katas/qft/rotation-gate-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTRotationGate
  ```

## Scenario: QFTRotationGate の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/rotation-gate.md benchmarks/incorrect/quantum-katas/qft/rotation-gate-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTRotationGate
  ```

## Scenario: QFTBinaryFractionClassical の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-classical.md benchmarks/solutions/quantum-katas/qft/binary-fraction-classical.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTBinaryFractionClassical
  ```

## Scenario: QFTBinaryFractionClassical の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-classical.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-classical-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionClassical
  ```

## Scenario: QFTBinaryFractionClassical の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-classical.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-classical-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionClassical
  ```

## Scenario: QFTBinaryFractionQuantum の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-quantum.md benchmarks/solutions/quantum-katas/qft/binary-fraction-quantum.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTBinaryFractionQuantum
  ```

## Scenario: QFTBinaryFractionQuantum の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-quantum.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-quantum-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionQuantum
  ```

## Scenario: QFTBinaryFractionQuantum の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-quantum.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-quantum-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionQuantum
  ```

## Scenario: QFTBinaryFractionInplace の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-inplace.md benchmarks/solutions/quantum-katas/qft/binary-fraction-inplace.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTBinaryFractionInplace
  ```

## Scenario: QFTBinaryFractionInplace の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-inplace.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-inplace-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionInplace
  ```

## Scenario: QFTBinaryFractionInplace の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/binary-fraction-inplace.md benchmarks/incorrect/quantum-katas/qft/binary-fraction-inplace-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTBinaryFractionInplace
  ```

## Scenario: QFTQft の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/qft.md benchmarks/solutions/quantum-katas/qft/qft.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTQft
  ```

## Scenario: QFTQft の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/qft.md benchmarks/incorrect/quantum-katas/qft/qft-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTQft
  ```

## Scenario: QFTQft の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/qft.md benchmarks/incorrect/quantum-katas/qft/qft-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTQft
  ```

## Scenario: QFTAllBasisVectors の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-basis-vectors.md benchmarks/solutions/quantum-katas/qft/all-basis-vectors.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAllBasisVectors
  ```

## Scenario: QFTAllBasisVectors の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-basis-vectors.md benchmarks/incorrect/quantum-katas/qft/all-basis-vectors-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTAllBasisVectors
  ```

## Scenario: QFTAllBasisVectors の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-basis-vectors.md benchmarks/solutions/quantum-katas/qft/all-basis-vectors-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAllBasisVectors
  ```

## Scenario: QFTPeriodicState の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/periodic-state.md benchmarks/solutions/quantum-katas/qft/periodic-state.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTPeriodicState
  ```

## Scenario: QFTPeriodicState の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/periodic-state.md benchmarks/incorrect/quantum-katas/qft/periodic-state-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTPeriodicState
  ```

## Scenario: QFTPeriodicState の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/periodic-state.md benchmarks/solutions/quantum-katas/qft/periodic-state-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTPeriodicState
  ```

## Scenario: QFTAlternatingAmplitudes の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/alternating-amplitudes.md benchmarks/solutions/quantum-katas/qft/alternating-amplitudes.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAlternatingAmplitudes
  ```

## Scenario: QFTAlternatingAmplitudes の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/alternating-amplitudes.md benchmarks/incorrect/quantum-katas/qft/alternating-amplitudes-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTAlternatingAmplitudes
  ```

## Scenario: QFTAlternatingAmplitudes の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/alternating-amplitudes.md benchmarks/solutions/quantum-katas/qft/alternating-amplitudes-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAlternatingAmplitudes
  ```

## Scenario: QFTAllEvenVectors の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-even-vectors.md benchmarks/solutions/quantum-katas/qft/all-even-vectors.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAllEvenVectors
  ```

## Scenario: QFTAllEvenVectors の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-even-vectors.md benchmarks/incorrect/quantum-katas/qft/all-even-vectors-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTAllEvenVectors
  ```

## Scenario: QFTAllEvenVectors の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/all-even-vectors.md benchmarks/solutions/quantum-katas/qft/all-even-vectors-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTAllEvenVectors
  ```

## Scenario: QFTSquareWave の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/square-wave.md benchmarks/solutions/quantum-katas/qft/square-wave.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTSquareWave
  ```

## Scenario: QFTSquareWave の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/square-wave.md benchmarks/incorrect/quantum-katas/qft/square-wave-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTSquareWave
  ```

## Scenario: QFTSquareWave の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/square-wave.md benchmarks/solutions/quantum-katas/qft/square-wave-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTSquareWave
  ```

## Scenario: QFTSignalFrequency の標準解を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/signal-frequency.md benchmarks/solutions/quantum-katas/qft/signal-frequency.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTSignalFrequency
  ```

## Scenario: QFTSignalFrequency の誤答を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/signal-frequency.md benchmarks/incorrect/quantum-katas/qft/signal-frequency-wrong.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTSignalFrequency
  ```

## Scenario: QFTSignalFrequency の全体位相を検証する

- When "qni benchmark run benchmarks/quantum-katas/qft/signal-frequency.md benchmarks/solutions/quantum-katas/qft/signal-frequency-global-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS QFTSignalFrequency
  ```
