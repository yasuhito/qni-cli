Feature: Quantum Katas BasicGates Task 1.3 SignFlip
  Task 1.3 SignFlip: |+⟩ を |-⟩ に、|-⟩ を |+⟩ に変える
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|0⟩ - β|1⟩ に変える

  Scenario: Task 1.3 は |+> を |-> に変える
    Given 空の 1 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Z --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  Scenario: Task 1.3 は |-> を |+> に変える
    Given 1 qubit の初期状態が "|1>" である
    And "qni add H --qubit 0 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  Scenario: Task 1.3 は 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add Z --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.6,-0.8
      """

  Scenario: Task 1.3 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add Z --control 0 --qubit 1 --step 2" を実行
    And "qni add Z --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 標準出力:
      """
      ZI=1.0
      """

  Scenario: Task 1.3 は symbolic 表示で一般状態の符号反転を示す
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    And "qni add Z --qubit 0 --step 1" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      cos(theta/2)|0> - sin(theta/2)|1>
      """
