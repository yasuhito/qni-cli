Feature: Quantum Katas BasicGates Task 1.5 PhaseFlip
  Task 1.5 PhaseFlip: |1⟩ 成分にだけ位相 i を掛ける
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|0⟩ + iβ|1⟩ に変える

  Scenario: Task 1.5 は 0.6|0> + 0.8|1> の |1> 成分に i を掛ける
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.6,0.8i
      """

  Scenario: Task 1.5 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add S --control 0 --qubit 1 --step 2" を実行
    And "qni add S† --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 標準出力:
      """
      ZI=1.0
      """

  Scenario: Task 1.5 は symbolic 表示で位相 i を示す
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    Then 状態ベクトルは:
      """
      0.6|0> + 0.8i|1>
      """
