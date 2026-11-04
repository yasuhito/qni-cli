---
id: preparing-states/hardy-state
title: HardyState
source: Microsoft Quantum Katas / preparing_states__hardy_state
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
            real: 0.8660254037844387
            imaginary: 0.0
        - basis: "|01>"
          amplitude:
            real: 0.2886751345948129
            imaginary: 0.0
        - basis: "|10>"
          amplitude:
            real: 0.2886751345948129
            imaginary: 0.0
        - basis: "|11>"
          amplitude:
            real: 0.2886751345948129
            imaginary: 0.0
---

固定値: N=2（上流も固定）。

全量子ビットがゼロの状態から、`(3|00> + |01> + |10> + |11>)/sqrt(12)` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
