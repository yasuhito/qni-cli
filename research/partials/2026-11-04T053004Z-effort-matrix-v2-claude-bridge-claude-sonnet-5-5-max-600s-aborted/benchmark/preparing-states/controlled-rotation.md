---
id: preparing-states/controlled-rotation
title: ControlledRotation
source: Microsoft Quantum Katas / preparing_states__controlled_rotation
difficulty: fixed
available_gates:
  - H(target)
  - X(target)
  - Z(target)
  - Ry(angle, target)
  - P(angle, target)
  - CH(control, target)
  - CRy(angle, control, target)
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
            real: 0.7071067811865475
            imaginary: 0.0
        - basis: "|10>"
          amplitude:
            real: 0.5
            imaginary: 0.0
        - basis: "|11>"
          amplitude:
            real: 0.5
            imaginary: 0.0
---

固定値: N=2（上流も固定）。

全量子ビットがゼロの状態から、`|00>/sqrt(2) + (|10> + |11>)/2` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
