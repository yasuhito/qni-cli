Feature: Quantum Katas Superposition Task 1.6 BellState
  Task 1.6 BellState: |00⟩ から Bell 状態 |Φ⁺⟩ を作る

  入力:
  2 量子ビットの状態 |00⟩

  目標:
  状態を |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2) に変える

  この task では、最初の qubit を H で重ね合わせにし、
  その値を CNOT で 2 個目の qubit にコピーすると、
  2 qubit がもつれた Bell 状態になることを確かめる。

  Scenario: H のあとに CNOT を適用すると |00> は計算基底の Bell 重ね合わせになる
    Given 初期状態ベクトルは:
      """
      |00>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ H ├──■──
          └───┘┌─┴─┐
      q1: ─────┤ X ├
               └───┘
      """
    Then 計算基底での状態ベクトルは:
      """
      sqrt(2)/2|00> + sqrt(2)/2|11>
      """

  Scenario: H のあとに CNOT を適用すると |00> は Bell 基底の |Φ+> になる
    Given 初期状態ベクトルは:
      """
      |00>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ H ├──■──
          └───┘┌─┴─┐
      q1: ─────┤ X ├
               └───┘
      """
    Then Bell 基底での状態ベクトルは:
      """
      |Φ+>
      """
