# language: ja
機能: H ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に H ゲートを追加したい

  シナリオ: H ゲート追加で circuit.json を作成
    もし "qni add H --step 0 --qubit 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["H"]
        ]
      }
      """
