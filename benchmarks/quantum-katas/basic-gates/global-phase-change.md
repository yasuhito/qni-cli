---
id: basic-gates/global-phase-change
title: GlobalPhaseChange
source: Microsoft Quantum Katas / BasicGates
difficulty: smoke
allowed_commands:
  - qni add GlobalPhase
grading_cases:
  - id: target-zero
    setup_commands:
      - qni state set "0.7071067811865476|00> + 0.7071067811865476|10>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|00>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|10>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
  - id: target-one
    setup_commands:
      - qni state set "0.7071067811865476|01> + 0.7071067811865476|11>"
    checks:
      tolerance: 1e-15
      items:
        - type: run
          expected:
            - basis: "|01>"
              amplitude:
                real: 0.7071067811865476
                imaginary: 0
            - basis: "|11>"
              amplitude:
                real: -0.7071067811865476
                imaginary: 0
---

2量子ビットの回路で、制御量子ビット `q0` が `|1>` のときだけ、対象量子ビット `q1` の状態全体に `-1` のグローバル位相を掛ける量子回路を、`qni` コマンド列として作成してください。

単独のグローバル位相は観測不能です。このベンチマークでは `q0` を重ね合わせにした入力状態を `setup_commands` で準備し、制御付きグローバル位相の効果を `q0` の `|0>` 成分と `|1>` 成分の相対位相として採点します。

提出物では `qni add GlobalPhase --angle 2π --control 0 --qubit 1 --step 0` の形で、制御付き `GlobalPhase(2π)` を追加してください。
提出物は `.qni` 形式で、1行に1つずつ完全な `qni` コマンドを書いてください。
