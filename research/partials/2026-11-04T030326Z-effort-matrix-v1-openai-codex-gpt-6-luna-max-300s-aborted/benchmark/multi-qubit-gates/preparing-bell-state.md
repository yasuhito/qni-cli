---
id: multi-qubit-gates/preparing-bell-state
title: PreparingBellState
source: Microsoft Quantum Katas / multi_qubit_gates
difficulty: smoke
available_gates:
  - H(target)
  - CNOT(control, target)
  - Z(target)
  - GlobalPhase(angle, target)
allowed_commands:
  - qni add
grading_cases:
  - id: zero-input
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
                real: 0.7071067811865475
                imaginary: 0.0
            - basis: "|11>"
              amplitude:
                real: 0.7071067811865475
                imaginary: 0.0
---

# PreparingBellState

2量子ビット（N=2）の |00> から (|00> + |11>)/√2 を準備してください。パラメータはありません。上流同様、ゼロ入力のみを採点し、グローバル位相は無視します。相対位相は一致する必要があります。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/preparing_bell_state)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
