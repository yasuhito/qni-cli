# language: ja
機能: qni run コマンド
  qni-cli のユーザとして
  量子回路の状態ベクトルを確認するために
  qni run を実行したい

  シナリオ: qni run コマンドは成功
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば コマンドは成功

  シナリオ: qni run は状態ベクトルを標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: qni run は何もゲートを適用しない |0> の状態ベクトルを標準出力に表示
    前提 "circuit.json" を次で作成:
      """
      {
        "qubits": 1,
        "cols": [
          [1]
        ]
      }
      """
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は X ゲートの状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0
      """

  シナリオ: qni run は Y ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Y --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0i
      """

  シナリオ: qni run は |1> に H ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: qni run は |1> に X ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は |1> に Y ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Y --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      -1.0i,0.0
      """
