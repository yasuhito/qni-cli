---
id: basic-gates/two-qubit-gate-2
title: TwoQubitGate2
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - CZ(control, target)
allowed_commands:
  - qni add
grading_cases:
  - id: plus-plus-input
    setup_commands:
      - qni state set "0.5|00> + 0.5|01> + 0.5|10> + 0.5|11>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.5
                imaginary: 0
            - basis: "|01>"
              amplitude:
                real: 0.5
                imaginary: 0
            - basis: "|10>"
              amplitude:
                real: 0.5
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: -0.5
                imaginary: 0
  - id: eleven-input
    setup_commands:
      - qni state set "|11>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|11>"
              amplitude:
                real: -1
                imaginary: 0
  - id: ten-input
    setup_commands:
      - qni state set "|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|10>"
              amplitude:
                real: 1
                imaginary: 0
---

2量子ビットを `|+> ⊗ |+>` から `(|00> + |01> + |10> - |11>) / 2` に変える量子回路を設計してください。

`|+> ⊗ |+>` は `(|00> + |01> + |10> + |11>) / 2` です。
