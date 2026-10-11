---
id: single-qubit-gates/prepare-rotated-state
title: PrepareRotatedState
source: Microsoft Quantum Katas / single_qubit_gates__prepare_rotated_state
difficulty: smoke
available_gates:
  - Rx(angle, target)
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
                real: -0.8660254037844386
                imaginary: 0
            - basis: "|1>"
              amplitude:
                real: 0
                imaginary: -0.5
---

|0> から、回転ゲートを使って α|0> - iβ|1> を準備する1量子ビット回路を設計してください。固定値は α=-√3/2、β=1/2（α²+β²=1）です。角度はラジアンで指定します。

上流の実数引数を固定した課題です。α が負なので回転角の象限に注意してください。上流と同じくゼロ入力のみを検証し、グローバル位相も含めて振幅を一致させてください。
