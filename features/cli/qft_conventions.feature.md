# Feature: QFT の符号・ビット順・入力依存位相を区別する

## Scenario: 回転の指数の符号が逆なら不合格になる

- When "qni benchmark run benchmarks/quantum-katas/qft/rotation-gate.md benchmarks/incorrect/quantum-katas/qft/rotation-gate-negative-angle.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTRotationGate
  ```

## Scenario: QFT の最終ビット順交換を省略すると不合格になる

- When "qni benchmark run benchmarks/quantum-katas/qft/qft.md benchmarks/incorrect/quantum-katas/qft/qft-missing-swap.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTQft
  ```

## Scenario: ゼロ入力で同じでも他の入力に相対位相を付けると不合格になる

- When "qni benchmark run benchmarks/quantum-katas/qft/qft.md benchmarks/incorrect/quantum-katas/qft/qft-input-phase.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL QFTQft
  ```
