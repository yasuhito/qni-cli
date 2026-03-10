# language: ja
機能: Rz ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Rz ゲートを追加したい

  シナリオ: Rz ゲート追加で circuit.json を作成
    もし "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Rz(π/2)"]
        ]
      }
      """
