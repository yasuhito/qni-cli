---
id: single-qubit-gates/three-quarters-pi-phase
title: ThreeQuartersPiPhase
source: Microsoft Quantum Katas / single_qubit_gates__three_quarters_pi_phase
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
                real: 1
                imaginary: 0
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
                real: -0.7071067811865476
                imaginary: 0.7071067811865476
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
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: -0.5
                imaginary: 0.5
---

1量子ビットの回路を設計してください。α|0> + β|1> を α|0> + exp(3iπ/4)β|1> に変えてください。角度は 3π/4 に固定します。

振幅はグローバル位相も含めて一致させてください。|0>、|1>、|+> の入力を同じ回路で検証します。
