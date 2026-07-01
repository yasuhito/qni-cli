---
id: basic-gates/basis-change
title: BasisChange
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add
grading_cases:
  - id: zero-input
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
                real: 0.7071067811865476
                imaginary: 0
  - id: one-input
    setup_commands:
      - qni state set "1|1>"
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

1量子ビットに対して、`|0>` を `|+>` に、`|1>` を `|->` に変える量子回路を、`qni` コマンド列として作成してください。

`|+>` は `( |0> + |1> ) / sqrt(2)`、`|->` は `( |0> - |1> ) / sqrt(2)` の状態です。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
