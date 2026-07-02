---
id: basic-gates/phase-flip
title: PhaseFlip
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - S(target)
allowed_commands:
  - qni add
grading_cases:
  - id: zero-input
    setup_commands:
      - qni state set "|0>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-input
    setup_commands:
      - qni state set "|1>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|1>"
              amplitude:
                real: 0
                imaginary: 1
---

1量子ビットに対して、`|0>` を変えず、`|1>` の振幅にだけ位相 `i` を掛ける量子回路を設計してください。

これは一般に、`alpha|0> + beta|1>` を `alpha|0> + i beta|1>` に変える操作です。
