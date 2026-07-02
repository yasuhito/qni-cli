---
id: superposition/all-basis-vectors-two-qubits
title: AllBasisVectors_TwoQubits
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
available_gates:
  - H(target)
allowed_commands:
  - qni add
checks:
  tolerance: 1e-15
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
            real: 0.5
            imaginary: 0
---

2量子ビットを `|00>` から4つの計算基底状態の一様重ね合わせに変える量子回路を設計してください。

目標状態は `( |00> + |01> + |10> + |11> ) / 2` です。
