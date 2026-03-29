Feature: Quantum Katas BasicGates Task 1.1 StateFlip
  Task 1.1 StateFlip: |0⟩ を |1⟩ に、|1⟩ を |0⟩ に反転する

  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩

  目標:
  状態を α|1⟩ + β|0⟩ に変える

  具体例:
  |0⟩ を |1⟩ に変える
  |1⟩ を |0⟩ に変える

  Scenario: X ゲートは |0> を |1> に反転する
    Given 最初の状態ベクトルは:
      """
      |0>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """
    Then 状態ベクトルは:
      """
      |1>
      """

  Scenario: X ゲートは |1> を |0> に反転する
    Given 最初の状態ベクトルは:
      """
      |1>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """
    Then 状態ベクトルは:
      """
      |0>
      """

  Scenario: X ゲートは重ね合わせ状態でも |0> と |1> の振幅を入れ替える
    Given 最初の状態ベクトルは:
      """
      0.6|0> + 0.8|1>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """
    Then 状態ベクトルは:
      """
      0.8|0> + 0.6|1>
      """

  Scenario: X ゲートは symbolic 表示でも一般式の振幅を入れ替える
    Given 最初の状態ベクトルは:
      """
      cos(θ/2)|0> + sin(θ/2)|1>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """
    Then 状態ベクトルは:
      """
      sin(θ/2)|0> + cos(θ/2)|1>
      """

  Scenario: Task 1.1 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add X --control 0 --qubit 1 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 標準出力:
      """
      ZI=1.0
      """
