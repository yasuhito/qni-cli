---
id: basic-gates/bell-state-change-1
title: BellStateChange1
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
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
            - basis: "|00>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
---

2量子ビットの Bell 状態 `|Φ+>` を `|Φ->` に変える量子回路を設計してください。

`|Φ+>` は `( |00> + |11> ) / sqrt(2)`、`|Φ->` は `( |00> - |11> ) / sqrt(2)` の状態です。
