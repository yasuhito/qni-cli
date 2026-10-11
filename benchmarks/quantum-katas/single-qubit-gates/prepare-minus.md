---
id: single-qubit-gates/prepare-minus
title: PrepareMinus
source: Microsoft Quantum Katas / single_qubit_gates__prepare_minus
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
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: -0.7071067811865476
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
                real: 0.7071067811865476
                imaginary: 0
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
                real: 1
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0
                imaginary: 0
---

1量子ビットの回路を設計してください。|0> を |-> = (|0> - |1>)/sqrt(2) に変えてください。

この固定課題ではさらに |1> を |+>、|+> を |0> に変える変換を要求します。上流は |0> 入力だけを厳密採点しますが、ここでは X の後に H を作用させる変換全体を3入力で採点します。

振幅はグローバル位相も含めて一致させてください。|0>、|1>、|+> の入力を同じ回路で検証します。
