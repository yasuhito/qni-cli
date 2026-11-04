---
id: single-qubit-gates/global-phase-i
title: GlobalPhaseI
source: Microsoft Quantum Katas / single_qubit_gates__global_phase_i
difficulty: smoke
available_gates:
  - X(target)
  - Y(target)
  - Z(target)
  - H(target)
  - S(target)
  - T(target)
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
                real: 0
                imaginary: 1
            - basis: "|1>"
              amplitude:
                real: 0
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
                real: 0
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0
                imaginary: 1
  - id: plus-input
    setup_commands:
      - qni state set "0.7071067811865476|0> + 0.7071067811865476|1>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|0>"
              amplitude:
                real: 0
                imaginary: 0.7071067811865476
            - basis: "|1>"
              amplitude:
                real: 0
                imaginary: 0.7071067811865476
---

1量子ビットの回路を設計してください。任意の入力状態全体に位相 i を掛けてください。

振幅はグローバル位相も含めて一致させてください。|0>、|1>、|+> の入力を同じ回路で検証します。
