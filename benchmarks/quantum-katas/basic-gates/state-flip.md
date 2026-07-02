---
id: basic-gates/state-flip
title: StateFlip
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - X(target)
allowed_commands:
  - qni add
checks:
  tolerance: 1e-9
  items:
    - type: run
      expected:
        - basis: "|1>"
          amplitude:
            real: 1
            imaginary: 0
---

1量子ビットを `|0>` から `|1>` に反転する量子回路を設計してください。
