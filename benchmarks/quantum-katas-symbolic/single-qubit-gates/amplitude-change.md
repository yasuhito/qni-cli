---
id: single-qubit-gates/amplitude-change
title: AmplitudeChange
source: Microsoft Quantum Katas / single_qubit_gates__amplitude_change
difficulty: symbolic
available_gates:
  - Ry(angle, target)
  - X(target)
  - Y(target)
  - Z(target)
  - H(target)
  - S(target)
  - T(target)
allowed_commands:
  - qni add
symbolic:
  protocol: neutral-symbolic-circuit-json-v1
  qubits: 1
  mode: unitary
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
  up_to_global_phase: false
---

任意の実数 α に対して |0> → cos(α)|0> + sin(α)|1>、|1> → -sin(α)|0> + cos(α)|1> を実装してください。

量子ビット数は 1 固定、q0 は最上位ビット。補助量子ビットは禁止です。全体位相も厳密に一致させてください。状態準備はゼロ入力だけ、変換課題はユニタリ全体を検証します。角度はラジアンです。

提出は neutral-symbolic-circuit-json-v1 の JSON とし、parameters は [{"name":"alpha","real":true,"domain":"real"}] を宣言してください。式は文字列ではなく構文木を使います。sqrt の主値、asin/acos/atan の実数主値を使用し、式は全実数 α で定義されていなければなりません。ゲートのユニタリ性により出力の正規化は全引数で保証されます。固定値だけの一致では合格になりません。詳細は docs/symbolic-grading.md を参照してください。
