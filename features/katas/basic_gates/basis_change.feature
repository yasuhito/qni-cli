# language: ja
機能: Quantum Katas BasicGates Task 1.2 BasisChange
  Task 1.2 BasisChange: |0⟩ を |+⟩ に、|1⟩ を |-⟩ に変える
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  |0⟩ を |+⟩ = (|0⟩ + |1⟩) / sqrt(2) に変え、|1⟩ を |-⟩ = (|0⟩ - |1⟩) / sqrt(2) に変える
  重ね合わせ状態でも基底ベクトルへの作用に従って変換する

  シナリオ: Task 1.2 は |0> を |+> に変える
    前提 空の 1 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: Task 1.2 は |1> を |-> に変える
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: Task 1.2 は 0.6|0> + 0.8|1> を X basis へ変換する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.9899494936611664,-0.14142135623730953
      """

  シナリオ: Task 1.2 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add H --control 0 --qubit 1 --step 2" を実行
    かつ "qni add H --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=0.9999999999999993
      """

  シナリオ: Task 1.2 は symbolic 表示で一般状態への基底変換を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      0.707106781186547*sqrt(2)*sin(theta/2 + pi/4)|0> + 0.707106781186547*sqrt(2)*cos(theta/2 + pi/4)|1>
      """
