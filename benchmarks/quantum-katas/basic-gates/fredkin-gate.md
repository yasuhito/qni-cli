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
  - id: basis-000
    setup_commands:
      - qni state set "1|000>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-010
    setup_commands:
      - qni state set "1|010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|010>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-011
    setup_commands:
      - qni state set "1|011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|011>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-100
    setup_commands:
      - qni state set "1|100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|100>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-110
    setup_commands:
      - qni state set "1|110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-111
    setup_commands:
      - qni state set "1|111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|111>"
              amplitude:
                real: 1
                imaginary: 0
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
  - id: control-superposition
    setup_commands:
      - qni state set "0.6|001> + 0.8|101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|001>"
              amplitude:
                real: 0.6
                imaginary: 0
            - basis: "|110>"
              amplitude:
                real: 0.8
                imaginary: 0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.6|011> + 0.8i|101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|011>"
              amplitude:
                real: 0.6
                imaginary: 0
            - basis: "|110>"
              amplitude:
                real: 0
                imaginary: 0.8
---

3量子ビットに対して Fredkin ゲート（制御付き SWAP）を実現する量子回路を設計してください。

制御量子ビットは第1量子ビットです。制御量子ビットが `|1>` のときだけ、第2量子ビットと第3量子ビットを交換してください。制御量子ビットが `|0>` のときは状態を変えないでください。

全8個の計算基底と重ね合わせ状態で、振幅の符号と複素位相も含めて一致させてください。
