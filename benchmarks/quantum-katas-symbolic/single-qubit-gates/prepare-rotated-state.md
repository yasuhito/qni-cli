---
id: single-qubit-gates/prepare-rotated-state
title: PrepareRotatedState
source: Microsoft Quantum Katas / single_qubit_gates__prepare_rotated_state
difficulty: symbolic
available_gates:
  - Rx(angle, target)
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
  mode: state
  parameters:
    - name: phi
      real: true
      domain: real
  reference:
    operations:
      - gate: Rx
        targets: [0]
        angle:
          mul:
            - rational: ["2", "1"]
            - parameter: phi
  up_to_global_phase: false
---

任意の実数 φ に対し、ゼロ入力から cos(φ)|0> − i sin(φ)|1> を回転ゲートで準備してください。全体位相も含めて厳密に一致させます。

上流の実数 α, β（α²+β²=1）を α=cos(φ), β=sin(φ) で再パラメータ化します。これは符号を含む正規化された全円を覆い、負の α・負の β・零振幅も除外しません。上流の ArcTan2 による角度計算を入力 φ に移した契約です。asin(sin(φ)) や acos(cos(φ)) の主値への置換は全域では正しくありません。

量子ビット数は1固定、補助量子ビットは禁止、q0は最上位ビット。ゼロ入力だけを比較し、未使用の入力列は制約しません。角度はラジアン、正規化は全 φ で保証されます。提出は neutral-symbolic-circuit-json-v1 の制限構文木JSONで、parameters は [{"name":"phi","real":true,"domain":"real"}] とします。数値標本による救済はありません。詳細は docs/symbolic-grading.md を参照してください。
