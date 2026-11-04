---
id: basic-gates/state-flip
title: StateFlip
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - X(target)
allowed_commands:
  - qni add
grading_cases:
  - id: zero
    setup_commands:
      - qni state set "1|0>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|1>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one
    setup_commands:
      - qni state set "1|1>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 1
                imaginary: 0
  - id: real-superposition
    setup_commands:
      - qni state set "0.6|0> + 0.8|1>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 0.8
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.6
                imaginary: 0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.6|0> + 0.8i|1>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 0
                imaginary: 0.8
            - basis: "|1>"
              amplitude:
                real: 0.6
                imaginary: 0
---

1量子ビットの任意の状態 `α|0> + β|1>` を `β|0> + α|1>` に変える量子回路を設計してください。

振幅の符号と複素位相も含めて一致させてください。`|0>` を `|1>` に変えるだけでは不十分です。
