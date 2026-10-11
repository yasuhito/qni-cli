---
id: preparing-states/four-bitstrings
title: FourBitstrings
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
        - basis: "|001>"
          amplitude:
            real: 0.5
            imaginary: 0
        - basis: "|011>"
          amplitude:
            real: 0.5
            imaginary: 0
        - basis: "|100>"
          amplitude:
            real: 0.5
            imaginary: 0
        - basis: "|110>"
          amplitude:
            real: 0.5
            imaginary: 0
---

固定値: N=3、bits=[[false,false,true],[false,true,true],[true,false,false],[true,true,false]]（001,011,100,110）。

全量子ビットがゼロの状態から、`(|001> + |011> + |100> + |110>) / sqrt(4)` を準備してください。全体位相は問いません。

ビット配列の添字0は q0 に対応し、基底表記では左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
