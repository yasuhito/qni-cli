Feature: Quantum Katas Superposition Task 1.1 PlusState
  Task 1.1 PlusState: |0⟩ を |+⟩ に変える

  入力:
  1 量子ビットの状態 |0⟩

  目標:
  状態を |+⟩ = (|0⟩ + |1⟩) / sqrt(2) に変える

  この task では、Hadamard ゲート H が
  計算基底の |0⟩ を x 基底の |+⟩ に変えることを確かめる。

  Scenario: H ゲートは |0> を |+> に変える
    Given 初期状態ベクトルは:
      """
      |0>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ H ├
          └───┘
      """
    Then 計算基底での状態ベクトルは:
      """
      sqrt(2)/2|0> + sqrt(2)/2|1>
      """
    And |+>, |-> 基底での状態ベクトルは:
      """
      |+>
      """
