---
id: basic-gates/phase-change-pi-over-3
title: PhaseChangePiOver3
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - P(angle, target)
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
                real: 0.5000000000000001
                imaginary: 0.8660254037844386
---

1量子ビットに対して、`|0>` を変えず、`|1>` の振幅にだけ位相 `exp(i*pi/3)` を掛ける量子回路を設計してください。

これは Quantum Katas BasicGates の `PhaseChange` を、固定角度 `pi/3` で評価する課題です。
