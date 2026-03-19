# language: ja
機能: Quantum Katas BasicGates Task 1.1 StateFlip
  Task 1.1 StateFlip: |0⟩ を |1⟩ に、|1⟩ を |0⟩ に反転する
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|1⟩ + β|0⟩ に変える
  具体例:
  |0⟩ を |1⟩ に変える
  |1⟩ を |0⟩ に変える

  シナリオ: Task 1.1 は |0> を |1> に反転する
    前提 空の 1 qubit 回路がある
    かつ "qni add X --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0
      """

  シナリオ: Task 1.1 は |1> を |0> に反転する
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: Task 1.1 は 0.6|0> + 0.8|1> を 0.8|0> + 0.6|1> に反転する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.8,0.6
      """

  シナリオ: Task 1.1 は symbolic 表示で一般式の反転を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      sin(theta/2)|0> + cos(theta/2)|1>
      """

  シナリオ: Task 1.1 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add X --control 0 --qubit 1 --step 2" を実行
    かつ "qni add X --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """
