---
id: preparing-states/wstate-power-of-two
title: WStatePowerOfTwo
source: Microsoft Quantum Katas / preparing_states__wstate_power_of_two
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
        - basis: "|1000>"
          amplitude:
            real: 0.5
            imaginary: 0.0
        - basis: "|0100>"
          amplitude:
            real: 0.5
            imaginary: 0.0
        - basis: "|0010>"
          amplitude:
            real: 0.5
            imaginary: 0.0
        - basis: "|0001>"
          amplitude:
            real: 0.5
            imaginary: 0.0
---

固定値: N=4。

全量子ビットがゼロの状態から、`(|1000> + |0100> + |0010> + |0001>)/sqrt(4)` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。

1の個数がちょうど1である全ての基底状態を等しい振幅で重ね合わせます。固定長の回路として提出し、制御付き回転と CNOT を使って励起を隣の量子ビットへ分配できます。
