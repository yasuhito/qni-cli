---
id: preparing-states/wstate-arbitrary
title: WStateArbitrary
source: Microsoft Quantum Katas / preparing_states__wstate_arbitrary
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
        - basis: "|100>"
          amplitude:
            real: 0.5773502691896258
            imaginary: 0.0
        - basis: "|010>"
          amplitude:
            real: 0.5773502691896258
            imaginary: 0.0
        - basis: "|001>"
          amplitude:
            real: 0.5773502691896258
            imaginary: 0.0
---

固定値: N=3。

全量子ビットがゼロの状態から、`(|100> + |010> + |001>)/sqrt(3)` を準備してください。全体位相は問いません。

q0 は基底表記の左端です。補助量子ビットは使わず、指定した量子ビット数の回路を作ってください。一般の引数に対応する必要はありません。

1の個数がちょうど1である全ての基底状態を等しい振幅で重ね合わせます。固定長の回路として提出し、制御付き回転と CNOT を使って励起を隣の量子ビットへ分配できます。
