# Feature: Quantum Katas Superposition Task 1.5 AllBasisVectorsWithPhases_TwoQubits
  Task 1.5 AllBasisVectorsWithPhases_TwoQubits: |00⟩ を位相付きの一様重ね合わせに変える

  入力:
  2 量子ビットの状態 |00⟩

  目標:
  状態を (|00⟩ + i|01⟩ - |10⟩ - i|11⟩) / 2 に変える

  この task では、求める状態が
  |−⟩ ⊗ |+i⟩ の積状態として分解できることを使い、
  2 つの qubit に独立に位相を与えて目的の重ね合わせを作ることを確かめる。

## Scenario: q0 に H と Z、q1 に H と S を適用すると位相付きの一様重ね合わせになる
- Given 初期状態ベクトルは:
  ```
  |00>
  ```
- When 次の回路を適用:
  ```
      ┌───┐┌───┐
  q0: ┤ H ├┤ Z ├
      ├───┤├───┤
  q1: ┤ H ├┤ S ├
      └───┘└───┘
  ```
- Then 計算基底での状態ベクトルは:
  ```
  1/2|00> + i/2|01> - 1/2|10> - i/2|11>
  ```
