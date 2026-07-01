---
id: basic-gates/sign-flip
title: SignFlip
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add
grading_cases:
  - id: plus-input
    setup_commands:
      - qni state set "|+>"
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
  - id: minus-input
    setup_commands:
      - qni state set "|->"
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
---

1量子ビットに対して、`|+>` を `|->` に、`|->` を `|+>` に変える量子回路を、`qni` コマンド列として作成してください。

これは一般に、`alpha|0> + beta|1>` を `alpha|0> - beta|1>` に変える操作です。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
