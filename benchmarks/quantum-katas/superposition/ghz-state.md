---
id: superposition/ghz-state
title: GHZState
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
      expected:
        - basis: "|000>"
          amplitude:
            real: 0.7071067811865476
            imaginary: 0
        - basis: "|111>"
          amplitude:
            real: 0.7071067811865476
            imaginary: 0
---

このベンチマーク課題は、`N = 3` に固定した GHZState です。
3量子ビットを `|000>` から GHZ 状態 `( |000> + |111> ) / sqrt(2)` に変える量子回路を設計してください。

任意の `N` に対応する必要はありません。
