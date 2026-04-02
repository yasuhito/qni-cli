Feature: Quantum Katas Superposition Task 1.4 AllBasisVectorWithPhaseFlip_TwoQubits
  Task 1.4 AllBasisVectorWithPhaseFlip_TwoQubits: |00⟩ を |11⟩ だけ符号の反転した一様重ね合わせに変える

  入力:
  2 量子ビットの状態 |00⟩

  目標:
  状態を (|00⟩ + |01⟩ + |10⟩ - |11⟩) / 2 に変える

  この task では、まず 2 qubit の一様重ね合わせを作り、
  そのあと controlled-Z で |11⟩ の位相だけを反転することを確かめる。

  Scenario: H/H のあとに controlled-Z を適用すると |11> だけ符号が反転する
    Given 初期状態ベクトルは:
      """
      |00>
      """
    When 次の回路を適用:
      """
          ┌───┐      
      q0: ┤ H ├──■──
          ├───┤┌─┴─┐
      q1: ┤ H ├┤ Z ├
          └───┘└───┘
      """
    Then 計算基底での状態ベクトルは:
      """
      1/2|00> + 1/2|01> + 1/2|10> - 1/2|11>
      """
