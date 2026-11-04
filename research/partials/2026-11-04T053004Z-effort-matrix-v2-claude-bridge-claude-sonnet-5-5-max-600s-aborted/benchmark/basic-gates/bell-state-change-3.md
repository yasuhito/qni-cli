---
id: basic-gates/bell-state-change-3
title: BellStateChange3
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - X(target)
  - Z(target)
allowed_commands:
  - qni add
grading_cases:
  - id: phi-plus-input
    setup_commands:
      - qni state set "|Φ+>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|10>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
---

2量子ビットの Bell 状態 `|Φ+>` を `|Ψ->` に変える量子回路を設計してください。

`|Φ+>` は `( |00> + |11> ) / sqrt(2)`、`|Ψ->` は `( |01> - |10> ) / sqrt(2)` の状態です。
