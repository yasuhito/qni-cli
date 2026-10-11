---
id: multi-qubit-gates/controlled-rotation
title: ControlledRotation
source: Microsoft Quantum Katas / multi_qubit_gates
difficulty: smoke
available_gates:
  - CRx(angle, control, target)
  - Rx(angle, target)
  - Z(target)
allowed_commands:
  - qni add
grading_cases:
  - id: basis-00
    setup_commands:
      - qni state set "1|00>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01
    setup_commands:
      - qni state set "1|01>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10
    setup_commands:
      - qni state set "1|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10>"
              amplitude:
                real: 0.8660254037844386
                imaginary: 0.0
            - basis: "|11>"
              amplitude:
                real: 0.0
                imaginary: -0.5
  - id: basis-11
    setup_commands:
      - qni state set "1|11>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10>"
              amplitude:
                real: 0.0
                imaginary: -0.5
            - basis: "|11>"
              amplitude:
                real: 0.8660254037844386
                imaginary: 0.0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.18257418583505536|00> + 0.3651483716701107i|01> + 0.5477225575051661|10> + 0.7302967433402214i|11>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.18257418583505536
                imaginary: 0.0
            - basis: "|01>"
              amplitude:
                real: 0.0
                imaginary: 0.3651483716701107
            - basis: "|10>"
              amplitude:
                real: 0.8394900206953675
                imaginary: 0.0
            - basis: "|11>"
              amplitude:
                real: 0.0
                imaginary: 0.35859425328109273
---

# ControlledRotation

2量子ビット（N=2）の任意入力に、量子ビット0を制御、量子ビット1を対象とする Rx(θ) を適用してください。固定値は θ=π/3 です。Rx(θ)=exp(-iθX/2) の規約を使います。上流は複数角度を検証しますが、この課題は固定角度の部分的移植です。全4基底と制御をまたぐ複素重ね合わせを検証し、全体のグローバル位相のみ無視します。制御部分だけの位相変更は不正解です。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/controlled_rotation)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
