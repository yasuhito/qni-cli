---
id: preparing-states/unequal-superposition
title: UnequalSuperposition
source: Microsoft Quantum Katas / preparing_states__unequal_superposition
difficulty: symbolic
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
symbolic:
  protocol: neutral-symbolic-circuit-json-v1
  qubits: 1
  mode: state
  parameters:
    - name: alpha
      real: true
      domain: real
  reference:
    operations:
      - gate: Ry
        targets:
          - 0
        angle:
          mul:
            - rational:
                - "2"
                - "1"
            - parameter: alpha
  up_to_global_phase: true
---

任意の実数 α に対して、ゼロ入力から cos(α)|0> + sin(α)|1> を準備してください。

量子ビット数は 1 固定、q0 は最上位ビット。補助量子ビットは禁止です。共通の全体位相だけを許容します。状態準備はゼロ入力だけ、変換課題はユニタリ全体を検証します。角度はラジアンです。

提出は neutral-symbolic-circuit-json-v1 の JSON とし、parameters は [{"name":"alpha","real":true,"domain":"real"}] を宣言してください。式は文字列ではなく構文木を使います。sqrt の主値、asin/acos/atan の実数主値を使用し、式は全実数 α で定義されていなければなりません。ゲートのユニタリ性により出力の正規化は全引数で保証されます。固定値だけの一致では合格になりません。詳細は docs/symbolic-grading.md を参照してください。
