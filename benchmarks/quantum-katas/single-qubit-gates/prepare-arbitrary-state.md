---
id: single-qubit-gates/prepare-arbitrary-state
title: PrepareArbitraryState
source: Microsoft Quantum Katas / single_qubit_gates__prepare_arbitrary_state
difficulty: smoke
available_gates:
  - Ry(angle, target)
  - Rz(angle, target)
  - P(angle, target)
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
                real: 0.5
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0.4330127018922193
                imaginary: 0.75
---

|0> から α|0> + exp(iθ)β|1> を準備する1量子ビット回路を設計してください。固定値は α=1/2、β=√3/2（非負、α²+β²=1）、θ=π/3（ラジアン）です。

上流の実数引数を固定した課題です。上流と同じくゼロ入力のみを検証し、グローバル位相も含めて振幅を一致させてください。相対位相だけが正しくても、全体の位相が異なる状態は不合格です。
