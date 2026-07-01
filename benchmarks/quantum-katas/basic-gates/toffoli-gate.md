---
id: basic-gates/toffoli-gate
title: ToffoliGate
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add
grading_cases:
  - id: zero-zero-zero-input
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-one-zero-input
    setup_commands:
      - qni state set "|110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|111>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-one-one-input
    setup_commands:
      - qni state set "|111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|110>"
              amplitude:
                real: 1
                imaginary: 0
  - id: one-zero-one-input
    setup_commands:
      - qni state set "|101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: superposition-input
    setup_commands:
      - qni state set "0.6|110> + 0.8|111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|110>"
              amplitude:
                real: 0.8
                imaginary: 0
            - basis: "|111>"
              amplitude:
                real: 0.6
                imaginary: 0
---

3量子ビットの任意の状態で、1つ目と2つ目の量子ビットがどちらも `|1>` のときだけ3つ目の量子ビットを反転する量子回路を、`qni` コマンド列として作成してください。

提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
