---
id: basic-gates/global-phase-change
title: GlobalPhaseChange
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - ControlledGlobalPhase(angle, control, target)
allowed_commands:
  - qni add GlobalPhase
grading_cases:
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
---

2量子ビットの量子回路を設計してください。制御量子ビット `q0` が `|1>` のときだけ、対象量子ビット `q1` の状態全体に `-1` のグローバル位相を掛けます。

単独のグローバル位相は観測できないため、`q0` の `|0>` 成分と `|1>` 成分の相対位相として効果が現れるようにしてください。
