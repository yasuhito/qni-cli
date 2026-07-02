---
id: superposition/all-basis-vectors-with-phases-two-qubits
title: AllBasisVectorsWithPhases_TwoQubits
source: Microsoft Quantum Katas / Superposition
difficulty: smoke
available_gates:
  - H(target)
  - Z(target)
  - S(target)
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
            real: 0
            imaginary: 0.5
        - basis: "|10>"
          amplitude:
            real: -0.5
            imaginary: 0
        - basis: "|11>"
          amplitude:
            real: 0
            imaginary: -0.5
---

2量子ビットを `|00>` から、計算基底ごとに異なる位相を持つ一様重ね合わせに変える量子回路を設計してください。

目標状態は `( |00> + i|01> - |10> - i|11> ) / 2` です。
