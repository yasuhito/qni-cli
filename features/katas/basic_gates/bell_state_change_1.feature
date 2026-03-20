Feature: Quantum Katas BasicGates Task 1.8 BellStateChange1
  Task 1.8 BellStateChange1: |Φ⁺⟩ を |Φ⁻⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Φ⁻⟩ = (|00⟩ - |11⟩) / sqrt(2) に変える

  Scenario: Task 1.8 は |Φ⁺⟩ を |Φ⁻⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,0.0,0.0,-0.7071067811865475
      """

  Scenario: Task 1.8 は symbolic 表示で |Φ⁻⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.707106781186547|00> - 0.707106781186547|11>
      """

  Scenario: Task 1.8 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add Z --control 0 --qubit 1 --step 3" を実行
    And "qni add Z --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
