---
id: basic-gates/two-qubit-gate-3
title: TwoQubitGate3
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add
grading_cases:
  - id: zero-zero-input
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 1
                imaginary: 0
  - id: zero-one-input
    setup_commands:
      - qni state set "|01>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|10>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-zero-input
    setup_commands:
      - qni state set "|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 1
                imaginary: 0
  - id: superposition-input
    setup_commands:
      - qni state set "0.6|01> + 0.8|10>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 0.8
                imaginary: 0
            - basis: "|10>"
              amplitude:
                real: 0.6
                imaginary: 0
---

2量子ビットの任意の状態 `α|00> + β|01> + γ|10> + δ|11>` を、`α|00> + γ|01> + β|10> + δ|11>` に変える量子回路を、`qni` コマンド列として作成してください。

提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
