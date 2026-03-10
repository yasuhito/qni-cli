# language: ja
機能: CNOT ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と control と target に CNOT ゲートを追加したい

  シナリオ: CNOT ゲート追加で circuit.json を作成
    もし "qni add X --control 0 --qubit 1 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 2,
        "cols": [
          ["•", "X"]
        ]
      }
      """
