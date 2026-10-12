---
id: multi-qubit-gates/controlled-rotation
title: ControlledRotation
source: Microsoft Quantum Katas / multi_qubit_gates
difficulty: symbolic
available_gates:
  - CRx(angle, control, target)
  - Rx(angle, target)
  - Z(target)
allowed_commands:
  - qni add
symbolic:
  protocol: neutral-symbolic-circuit-json-v1
  qubits: 2
  mode: unitary
  parameters:
    - name: alpha
      real: true
      domain: real
  reference:
    operations:
      - gate: CRx
        targets:
          - 1
        controls:
          - 0
        angle:
          parameter: alpha
  up_to_global_phase: true
---

任意の実数 α に対して q0 を制御、q1 を対象とする Rx(α) を実装してください。

量子ビット数は 2 固定、q0 は最上位ビット。補助量子ビットは禁止です。共通の全体位相だけを許容します。状態準備はゼロ入力だけ、変換課題はユニタリ全体を検証します。角度はラジアンです。

提出は neutral-symbolic-circuit-json-v1 の JSON とし、parameters は [{"name":"alpha","real":true,"domain":"real"}] を宣言してください。式は文字列ではなく構文木を使います。sqrt の主値、asin/acos/atan の実数主値を使用し、式は全実数 α で定義されていなければなりません。ゲートのユニタリ性により出力の正規化は全引数で保証されます。固定値だけの一致では合格になりません。詳細は docs/symbolic-grading.md を参照してください。
