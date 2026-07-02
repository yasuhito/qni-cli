---
id: superposition/minus-state
title: MinusState
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
available_gates:
  - X(target)
  - H(target)
allowed_commands:
  - qni add
checks:
  tolerance: 1e-15
  items:
    - type: run
      expected:
        - basis: "|0>"
          amplitude:
            real: 0.7071067811865476
            imaginary: 0
        - basis: "|1>"
          amplitude:
            real: -0.7071067811865476
            imaginary: 0
---

1量子ビットを `|0>` から `|->` に変える量子回路を設計してください。

`|->` は `( |0> - |1> ) / sqrt(2)` の重ね合わせ状態です。
