---
id: basic-gates/fredkin-gate
title: FredkinGate
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
available_gates:
  - CSWAP(control, target1, target2)
allowed_commands:
  - qni add
grading_cases:
  - id: control-zero
    setup_commands:
      - qni state set "1|001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|001>"
              amplitude:
                real: 1
                imaginary: 0
  - id: control-one
    setup_commands:
      - qni state set "1|101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|110>"
              amplitude:
                real: 1
                imaginary: 0
---

3量子ビットに対して Fredkin ゲート（制御付き SWAP）を実現する量子回路を設計してください。

制御量子ビットは第1量子ビットです。制御量子ビットが `|1>` のときだけ、第2量子ビットと第3量子ビットを交換してください。制御量子ビットが `|0>` のときは状態を変えないでください。
