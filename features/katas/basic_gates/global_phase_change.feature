Feature: Quantum Katas BasicGates Task 1.7 GlobalPhaseChange
  Task 1.7 GlobalPhaseChange: 状態全体に -1 を掛ける
  入力:
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  状態を -β|0⟩ - γ|1⟩ に変える
  注意:
  単独の qubit ではグローバル位相は観測できないため、controlled 版で確認する

  Scenario: Task 1.7 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add Rz --angle 2π --control 0 --qubit 1 --step 2" を実行
    And "qni add Rz --angle -2π --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12

  Scenario: Task 1.7 は symbolic 表示で全体に -1 が掛かることを示す
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add Rz --angle 2π --qubit 0 --step 1" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      -0.6|0> - 0.8|1>
      """
