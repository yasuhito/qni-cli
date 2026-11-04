---
id: single-qubit-gates/amplitude-change
title: AmplitudeChange
source: Microsoft Quantum Katas / single_qubit_gates__amplitude_change
difficulty: smoke
available_gates:
  - Ry(angle, target)
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
                real: 0.8660254037844386
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.5
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
                real: -0.5
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.8660254037844386
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
                real: 0.25881904510252074
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.9659258262890683
                imaginary: 0
---

1量子ビットの回路を設計してください。固定値 α=π/6（ラジアン）で、|0> を cos(α)|0> + sin(α)|1> に、|1> を -sin(α)|0> + cos(α)|1> に変換してください。重ね合わせにも同じ線形変換を適用してください。

上流の角度引数を1つの固定値にした課題です。|0>、|1>、|+> の入力を同じ回路で検証します。上流の厳密比較に従い、グローバル位相も含めて振幅を一致させてください。
