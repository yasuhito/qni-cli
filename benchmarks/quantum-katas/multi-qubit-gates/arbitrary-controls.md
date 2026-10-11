---
id: multi-qubit-gates/arbitrary-controls
title: ArbitraryControls
source: Microsoft Quantum Katas / multi_qubit_gates
difficulty: smoke
available_gates:
  - X(target)
  - MCX(controls, target)
allowed_commands:
  - qni add
grading_cases:
  - id: basis-00000
    setup_commands:
      - qni state set "1|00000>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00001
    setup_commands:
      - qni state set "1|00001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00001>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00010
    setup_commands:
      - qni state set "1|00010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00010>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00011
    setup_commands:
      - qni state set "1|00011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00011>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00100
    setup_commands:
      - qni state set "1|00100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00100>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00101
    setup_commands:
      - qni state set "1|00101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00110
    setup_commands:
      - qni state set "1|00110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00110>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-00111
    setup_commands:
      - qni state set "1|00111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00111>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01000
    setup_commands:
      - qni state set "1|01000>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01001
    setup_commands:
      - qni state set "1|01001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01001>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01010
    setup_commands:
      - qni state set "1|01010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01010>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01011
    setup_commands:
      - qni state set "1|01011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01011>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01100
    setup_commands:
      - qni state set "1|01100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01100>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01101
    setup_commands:
      - qni state set "1|01101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01110
    setup_commands:
      - qni state set "1|01110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01110>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-01111
    setup_commands:
      - qni state set "1|01111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|01111>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10000
    setup_commands:
      - qni state set "1|10000>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10001
    setup_commands:
      - qni state set "1|10001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10001>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10010
    setup_commands:
      - qni state set "1|10010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10010>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10011
    setup_commands:
      - qni state set "1|10011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10011>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10100
    setup_commands:
      - qni state set "1|10100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10101
    setup_commands:
      - qni state set "1|10101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10100>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10110
    setup_commands:
      - qni state set "1|10110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10110>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-10111
    setup_commands:
      - qni state set "1|10111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|10111>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11000
    setup_commands:
      - qni state set "1|11000>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11000>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11001
    setup_commands:
      - qni state set "1|11001>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11001>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11010
    setup_commands:
      - qni state set "1|11010>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11010>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11011
    setup_commands:
      - qni state set "1|11011>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11011>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11100
    setup_commands:
      - qni state set "1|11100>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11100>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11101
    setup_commands:
      - qni state set "1|11101>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11101>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11110
    setup_commands:
      - qni state set "1|11110>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11110>"
              amplitude:
                real: 1
                imaginary: 0
  - id: basis-11111
    setup_commands:
      - qni state set "1|11111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|11111>"
              amplitude:
                real: 1
                imaginary: 0
  - id: complex-superposition
    setup_commands:
      - qni state set "0.009349469900084572|00000> + 0.018698939800169144i|00001> + 0.028048409700253712|00010> + 0.03739787960033829i|00011> + 0.046747349500422856|00100> + 0.056096819400507425i|00101> + 0.065446289300592|00110> + 0.07479575920067658i|00111> + 0.08414522910076114|01000> + 0.09349469900084571i|01001> + 0.10284416890093029|01010> + 0.11219363880101485i|01011> + 0.12154310870109943|01100> + 0.130892578601184i|01101> + 0.14024204850126856|01110> + 0.14959151840135315i|01111> + 0.1589409883014377|10000> + 0.16829045820152227i|10001> + 0.17763992810160686|10010> + 0.18698939800169143i|10011> + 0.196338867901776|10100> + 0.20568833780186058i|10101> + 0.21503780770194514|10110> + 0.2243872776020297i|10111> + 0.2337367475021143|11000> + 0.24308621740219885i|11001> + 0.25243568730228344|11010> + 0.261785157202368i|11011> + 0.27113462710245256|11100> + 0.2804840970025371i|11101> + 0.2898335669026217|11110> + 0.2991830368027063i|11111>"
    checks:
      tolerance: 1e-9
      items:
        - type: run
          up_to_global_phase: true
          expected:
            - basis: "|00000>"
              amplitude:
                real: 0.009349469900084572
                imaginary: 0.0
            - basis: "|00001>"
              amplitude:
                real: 0.0
                imaginary: 0.018698939800169144
            - basis: "|00010>"
              amplitude:
                real: 0.028048409700253712
                imaginary: 0.0
            - basis: "|00011>"
              amplitude:
                real: 0.0
                imaginary: 0.03739787960033829
            - basis: "|00100>"
              amplitude:
                real: 0.046747349500422856
                imaginary: 0.0
            - basis: "|00101>"
              amplitude:
                real: 0.0
                imaginary: 0.056096819400507425
            - basis: "|00110>"
              amplitude:
                real: 0.065446289300592
                imaginary: 0.0
            - basis: "|00111>"
              amplitude:
                real: 0.0
                imaginary: 0.07479575920067658
            - basis: "|01000>"
              amplitude:
                real: 0.08414522910076114
                imaginary: 0.0
            - basis: "|01001>"
              amplitude:
                real: 0.0
                imaginary: 0.09349469900084571
            - basis: "|01010>"
              amplitude:
                real: 0.10284416890093029
                imaginary: 0.0
            - basis: "|01011>"
              amplitude:
                real: 0.0
                imaginary: 0.11219363880101485
            - basis: "|01100>"
              amplitude:
                real: 0.12154310870109943
                imaginary: 0.0
            - basis: "|01101>"
              amplitude:
                real: 0.0
                imaginary: 0.130892578601184
            - basis: "|01110>"
              amplitude:
                real: 0.14024204850126856
                imaginary: 0.0
            - basis: "|01111>"
              amplitude:
                real: 0.0
                imaginary: 0.14959151840135315
            - basis: "|10000>"
              amplitude:
                real: 0.1589409883014377
                imaginary: 0.0
            - basis: "|10001>"
              amplitude:
                real: 0.0
                imaginary: 0.16829045820152227
            - basis: "|10010>"
              amplitude:
                real: 0.17763992810160686
                imaginary: 0.0
            - basis: "|10011>"
              amplitude:
                real: 0.0
                imaginary: 0.18698939800169143
            - basis: "|10100>"
              amplitude:
                real: 0.0
                imaginary: 0.20568833780186058
            - basis: "|10101>"
              amplitude:
                real: 0.196338867901776
                imaginary: 0.0
            - basis: "|10110>"
              amplitude:
                real: 0.21503780770194514
                imaginary: 0.0
            - basis: "|10111>"
              amplitude:
                real: 0.0
                imaginary: 0.2243872776020297
            - basis: "|11000>"
              amplitude:
                real: 0.2337367475021143
                imaginary: 0.0
            - basis: "|11001>"
              amplitude:
                real: 0.0
                imaginary: 0.24308621740219885
            - basis: "|11010>"
              amplitude:
                real: 0.25243568730228344
                imaginary: 0.0
            - basis: "|11011>"
              amplitude:
                real: 0.0
                imaginary: 0.261785157202368
            - basis: "|11100>"
              amplitude:
                real: 0.27113462710245256
                imaginary: 0.0
            - basis: "|11101>"
              amplitude:
                real: 0.0
                imaginary: 0.2804840970025371
            - basis: "|11110>"
              amplitude:
                real: 0.2898335669026217
                imaginary: 0.0
            - basis: "|11111>"
              amplitude:
                real: 0.0
                imaginary: 0.2991830368027063
---

# ArbitraryControls

制御レジスタの長さを N=4、controlBits=[true,false,true,false] に固定します（全体は5量子ビット）。制御は量子ビット0,1,2,3、対象は量子ビット4です。制御が |1010> の場合だけ対象に X を適用し、制御レジスタを元の状態に戻してください。基底表記は |q0 q1 q2 q3 q4> です。上流の全16制御パターンのうち1パターンの部分的移植で、全32基底と複素重ね合わせを検証します。グローバル位相は無視します。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/arbitrary_controls)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
