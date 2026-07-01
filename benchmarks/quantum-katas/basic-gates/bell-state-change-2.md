---
id: basic-gates/bell-state-change-2
title: BellStateChange2
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
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
                real: 0.7071067811865476
                imaginary: 0
---

2量子ビットの Bell 状態 `|Φ+>` を `|Ψ+>` に変える量子回路を、`qni` コマンド列として作成してください。

`|Φ+>` は `( |00> + |11> ) / sqrt(2)`、`|Ψ+>` は `( |01> + |10> ) / sqrt(2)` の状態です。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
