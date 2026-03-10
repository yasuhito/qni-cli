# language: ja
機能: Phase ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Phase ゲートを追加したい

  シナリオ: Phase ゲート追加で circuit.json を作成
    もし "qni add P --angle π/3 --qubit 0 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["P(π/3)"]
        ]
      }
      """

  シナリオ: Phase ゲートは angle がないと追加できない
    もし "qni add P --qubit 0 --step 0" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      angle is required for P
      """
