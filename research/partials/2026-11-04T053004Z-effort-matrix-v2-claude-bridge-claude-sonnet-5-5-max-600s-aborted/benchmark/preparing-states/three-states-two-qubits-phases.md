---
id: preparing-states/three-states-two-qubits-phases
title: ThreeStatesTwoQubitsPhases
source: Microsoft Quantum Katas / preparing_states__three_states_two_qubits_phases
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
            real: 0.5773502691896258
            imaginary: 0.0
        - basis: "|01>"
          amplitude:
            real: -0.2886751345948129
            imaginary: 0.5
        - basis: "|10>"
          amplitude:
            real: -0.2886751345948129
            imaginary: -0.5
---

固定値: N=2、位相=2π/3,4π/3（上流も固定）。

全量子ビットがゼロの状態から、`(|00> + exp(2πi/3)|01> + exp(4πi/3)|10>)/sqrt(3)` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。
