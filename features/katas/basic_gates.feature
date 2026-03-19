# language: ja
機能: Quantum Katas BasicGates
  qni-cli のユーザとして
  Quantum Katas の Task 1.1 を回帰テストに残すために
  StateFlip を qni-cli で再現したい

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
