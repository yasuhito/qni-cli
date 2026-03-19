Feature: X ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に X ゲートを追加したい

  Scenario: X ゲート追加で circuit.json を作成
    When "qni add X --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["X"]
        ]
      }
      """
