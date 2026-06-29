---
id: superposition/bell-state
title: BellState
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
allowed_commands:
  - qni add
checks:
  tolerance: 1e-9
  items:
    - type: expect
      expected:
        - pauli: ZZ
          value: 1
        - pauli: XX
          value: 1
---

2量子ビットを `|00>` から Bell 状態 `|Φ+>` に変える量子回路を、`qni` コマンド列として作成してください。

`|Φ+>` は `( |00> + |11> ) / sqrt(2)` のエンタングルした状態です。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
