---
id: single-qubit-gates/prepare-arbitrary-state
title: PrepareArbitraryState
source: Microsoft Quantum Katas / single_qubit_gates__prepare_arbitrary_state
difficulty: symbolic
available_gates:
  - Ry(angle, target)
  - Rz(angle, target)
  - P(angle, target)
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
    - name: alpha
      real: true
      domain: unit-interval
    - name: theta
      real: true
      domain: real
  reference:
    operations:
      - gate: Ry
        targets: [0]
        angle:
          mul:
            - rational: ["2", "1"]
            - acos:
                parameter: alpha
      - gate: P
        targets: [0]
        angle:
          parameter: theta
  up_to_global_phase: false
---

任意の α∈[-1,1] と独立した実数 θ に対して、ゼロ入力から α|0> + exp(iθ)√(1−α²)|1> を準備してください。β=√(1−α²) は非負主値です。全体位相も含めて厳密に一致させます。

閉区間は α=−1,0,1 を含みます。acos の実数主値 [0,π] を使うと cos(acos(α))=α、sin(acos(α))=√(1−α²) で、負の α の象限も保存します。asin への単純置換や Rz のみの位相操作は厳密な状態比較に一致しません。

量子ビット数は1固定、補助量子ビットは禁止、q0は最上位ビット。ゼロ入力だけを比較し、未使用の入力列は制約しません。角度はラジアン、α²+β²=1 により正規化されます。提出は neutral-symbolic-circuit-json-v1 の制限構文木JSONで、parameters は [{"name":"alpha","real":true,"domain":"unit-interval"},{"name":"theta","real":true,"domain":"real"}] とします。unit-interval は [-1,1]（[0,1]ではない）です。定義域の変更は不合格です。

上流本文の β≥0 を採用します。上流 Verification.qs の β=sin(i) による負の β の例は本文と一致しないため、この課題には含めません。旧固定値版と保存済み結果は維持します。詳細は docs/symbolic-grading.md を参照してください。
