# language: ja
機能: Rx ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Rx ゲートを追加したい

  シナリオ: Rx ゲート追加で circuit.json を作成
    もし "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Rx(π/2)"]
        ]
      }
      """

  シナリオ: Rx ゲートは angle がないと追加できない
    もし "qni add Rx --qubit 0 --step 0" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      angle is required for Rx
      """
