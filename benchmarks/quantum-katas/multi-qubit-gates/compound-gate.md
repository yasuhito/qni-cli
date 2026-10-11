---
id: multi-qubit-gates/compound-gate
title: CompoundGate
source: Microsoft Quantum Katas / multi_qubit_gates
difficulty: smoke
available_gates:
  - S(target)
  - Y(target)
  - X(target)
  - GlobalPhase(angle, target)
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
            - basis: "|001>"
              amplitude:
                real: 0.0
                imaginary: 1.0
  - id: basis-001
    setup_commands:
      - qni state set "1|001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|000>"
              amplitude:
                real: 0.0
                imaginary: -1.0
  - id: basis-010
    setup_commands:
      - qni state set "1|010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|011>"
              amplitude:
                real: 0.0
                imaginary: 1.0
  - id: basis-011
    setup_commands:
      - qni state set "1|011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|010>"
              amplitude:
                real: 0.0
                imaginary: -1.0
  - id: basis-100
    setup_commands:
      - qni state set "1|100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|101>"
              amplitude:
                real: -1.0
                imaginary: 0.0
  - id: basis-101
    setup_commands:
      - qni state set "1|101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|100>"
              amplitude:
                real: 1.0
                imaginary: 0.0
  - id: basis-110
    setup_commands:
      - qni state set "1|110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|111>"
              amplitude:
                real: -1.0
                imaginary: 0.0
  - id: basis-111
    setup_commands:
      - qni state set "1|111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|110>"
              amplitude:
                real: 1.0
                imaginary: 0.0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.07001400420140048|000> + 0.14002800840280097i|001> + 0.21004201260420147|010> + 0.28005601680560194i|011> + 0.3500700210070024|100> + 0.42008402520840293i|101> + 0.4900980294098034|110> + 0.5601120336112039i|111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          expected:
            - basis: "|000>"
              amplitude:
                real: 0.14002800840280097
                imaginary: 0.0
            - basis: "|001>"
              amplitude:
                real: 0.0
                imaginary: 0.07001400420140048
            - basis: "|010>"
              amplitude:
                real: 0.28005601680560194
                imaginary: 0.0
            - basis: "|011>"
              amplitude:
                real: 0.0
                imaginary: 0.21004201260420147
            - basis: "|100>"
              amplitude:
                real: 0.0
                imaginary: 0.42008402520840293
            - basis: "|101>"
              amplitude:
                real: -0.3500700210070024
                imaginary: 0.0
            - basis: "|110>"
              amplitude:
                real: 0.0
                imaginary: 0.5601120336112039
            - basis: "|111>"
              amplitude:
                real: -0.4900980294098034
                imaginary: 0.0
---

# CompoundGate

3量子ビット（N=3）の任意入力に、量子ビット0の S、量子ビット1の恒等操作、量子ビット2の Y からなる S ⊗ I ⊗ Y を適用してください。パラメータはありません。基底の表記は |q0 q1 q2> です。全8基底と複素重ね合わせを、グローバル位相を含めて厳密比較します。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/compound_gate)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
