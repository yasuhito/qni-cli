Feature: Quantum Katas BasicGates Task 1.9 BellStateChange2
  Task 1.9 BellStateChange2: |Φ⁺⟩ を |Ψ⁺⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Ψ⁺⟩ = (|01⟩ + |10⟩) / sqrt(2) に変える

  Scenario: Task 1.9 は |Φ⁺⟩ を |Ψ⁺⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865475,0.7071067811865475,0.0
      """

  Scenario: Task 1.9 は symbolic 表示で |Ψ⁺⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      sqrt(2)/2|01> + sqrt(2)/2|10>
      """

  Scenario: Task 1.9 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add X --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
