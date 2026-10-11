---
id: preparing-states/parity-bitstrings
title: ParityBitstrings
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
        - basis: "|0001>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|0010>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|0100>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|0111>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|1000>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|1011>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|1101>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
        - basis: "|1110>"
          amplitude:
            real: 0.35355339059327373
            imaginary: 0
---

固定値: N=4、parity=1（1の個数が奇数）。

全量子ビットがゼロの状態から、`(|0001> + |0010> + |0100> + |0111> + |1000> + |1011> + |1101> + |1110>) / sqrt(8)` を準備してください。全体位相は問いません。

ビット配列の添字0は q0 に対応し、基底表記では左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
