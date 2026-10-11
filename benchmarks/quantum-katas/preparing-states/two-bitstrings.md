---
id: preparing-states/two-bitstrings
title: TwoBitstrings
source: Microsoft Quantum Katas / Preparing Quantum States
difficulty: fixed
available_gates:
  - H(target)
  - X(target)
  - Z(target)
  - CNOT(control, target)
allowed_commands:
  - qni add
checks:
  tolerance: 1e-9
  items:
    - type: run
      up_to_global_phase: true
      expected:
        - basis: "|010>"
          amplitude:
            real: 0.7071067811865475
            imaginary: 0
        - basis: "|111>"
          amplitude:
            real: 0.7071067811865475
            imaginary: 0
---

固定値: N=3、bits1=[false,true,false]（010）、bits2=[true,true,true]（111）。

全量子ビットがゼロの状態から、`(|010> + |111>) / sqrt(2)` を準備してください。全体位相は問いません。

ビット配列の添字0は q0 に対応し、基底表記では左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
