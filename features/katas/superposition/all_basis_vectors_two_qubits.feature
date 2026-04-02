Feature: Quantum Katas Superposition Task 1.3 AllBasisVectors_TwoQubits
  Task 1.3 AllBasisVectors_TwoQubits: |00⟩ を 4 つの基底状態の一様重ね合わせに変える

  入力:
  2 量子ビットの状態 |00⟩

  目標:
  状態を (|00⟩ + |01⟩ + |10⟩ + |11⟩) / 2 に変える

  この task では、各 qubit に Hadamard ゲート H をかけると
  2 qubit 系全体では 4 つの計算基底状態が等振幅で現れることを確かめる。

  Scenario: 2 つの H ゲートは |00> を 4 つの基底状態の一様重ね合わせに変える
    Given 初期状態ベクトルは:
      """
      |00>
      """
    When 次の回路を適用:
      """
          ┌───┐
      q0: ┤ H ├
          ├───┤
      q1: ┤ H ├
          └───┘
      """
    Then 計算基底での状態ベクトルは:
      """
      1/2|00> + 1/2|01> + 1/2|10> + 1/2|11>
      """
