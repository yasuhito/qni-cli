---
id: superposition/ghz-state
title: GHZState
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
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
3量子ビットを `|000>` から GHZ 状態 `( |000> + |111> ) / sqrt(2)` に変える量子回路を、`qni` コマンド列として作成してください。

任意の `N` に対応する必要はありません。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
