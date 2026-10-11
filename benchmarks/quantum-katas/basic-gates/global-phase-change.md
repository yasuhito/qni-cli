---
id: basic-gates/global-phase-change
title: GlobalPhaseChange
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - CNOT(control, target)
  - CZ(control, target)
  - ControlledGlobalPhase(angle, control, target)
allowed_commands:
  - qni add
grading_cases:
  - id: basis-00
    setup_commands:
      - qni state set "1|00>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01
    setup_commands:
      - qni state set "1|01>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10
    setup_commands:
      - qni state set "1|10>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|10>"
              amplitude:
                real: -1
                imaginary: 0
  - id: basis-11
    setup_commands:
      - qni state set "1|11>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|11>"
              amplitude:
                real: -1
                imaginary: 0
  - id: target-zero
    setup_commands:
      - qni state set "0.7071067811865476|00> + 0.7071067811865476|10>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|10>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
  - id: target-one
    setup_commands:
      - qni state set "0.7071067811865476|01> + 0.7071067811865476|11>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.5|00> + 0.5i|01> + 0.5|10> + 0.5i|11>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.5
                imaginary: 0
            - basis: "|01>"
              amplitude:
                real: 0
                imaginary: 0.5
            - basis: "|10>"
              amplitude:
                real: -0.5
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: 0
                imaginary: -0.5
---

2量子ビットの量子回路を設計してください。制御量子ビット `q0` が `|1>` のときだけ、対象量子ビット `q1` の状態全体に `-1` のグローバル位相を掛けます。

単独のグローバル位相は観測できないため、`q0` の `|0>` 成分と `|1>` 成分の相対位相として効果が現れるようにしてください。

上流の1量子ビット課題の `-I` を制御付きにした課題です。制御付き Pauli ゲートの組み合わせでも実現できます。全4個の計算基底と重ね合わせ状態で、振幅の符号と複素位相も含めて一致させてください。
