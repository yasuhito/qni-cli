---
id: preparing-states/unequal-superposition
title: UnequalSuperposition
source: Microsoft Quantum Katas / preparing_states__unequal_superposition
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
        - basis: "|0>"
          amplitude:
            real: 0.8660254037844386
            imaginary: 0.0
        - basis: "|1>"
          amplitude:
            real: 0.5
            imaginary: 0.0
---

固定値: N=1、α=π/6。

全量子ビットがゼロの状態から、`cos(α)|0> + sin(α)|1>` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
