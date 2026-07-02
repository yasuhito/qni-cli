---
id: basic-gates/two-qubit-gate-1
title: TwoQubitGate1
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - CNOT(control, target)
allowed_commands:
  - qni add
grading_cases:
  - id: zero-input
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-input
    setup_commands:
      - qni state set "|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|11>"
              amplitude:
                real: 1
                imaginary: 0
  - id: superposition-input
    setup_commands:
      - qni state set "0.6|00> + 0.8|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.6
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: 0.8
                imaginary: 0
---

2量子ビットのうち、1つ目の量子ビットが `α|0> + β|1>`、2つ目の量子ビットが `|0>` の状態から、`α|00> + β|11>` に変える量子回路を設計してください。
