---
id: superposition/bell-state
title: BellState
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
available_gates:
  - H(target)
  - CNOT(control, target)
allowed_commands:
  - qni add
checks:
  tolerance: 1e-9
  items:
    - type: run
      up_to_global_phase: true
      expected:
        - basis: "|00>"
          amplitude:
            real: 0.7071067811865476
            imaginary: 0
        - basis: "|11>"
          amplitude:
            real: 0.7071067811865476
            imaginary: 0
---

2量子ビットを `|00>` から Bell 状態 `|Φ+>` に変える量子回路を設計してください。

`|Φ+>` は `( |00> + |11> ) / sqrt(2)` のエンタングルした状態です。
