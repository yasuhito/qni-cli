# language: ja
機能: S ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に S ゲートを追加したい

  シナリオ: S ゲート追加で circuit.json を作成
    もし "qni add S --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["S"]
        ]
      }
      """
