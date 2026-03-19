# language: ja
機能: Ry ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Ry ゲートを追加したい

  シナリオ: Ry ゲート追加で circuit.json を作成
    もし "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(π/2)"]
        ]
      }
      """

  シナリオ: Ry ゲートは変数 angle をそのまま保存できる
    もし "qni add Ry --angle theta --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  シナリオ: Ry ゲートは単純な角度式をそのまま保存できる
    もし "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(2*alpha)"]
        ]
      }
      """
