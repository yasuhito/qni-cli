Feature: CNOT ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と control と target に CNOT ゲートを追加したい

  Scenario: CNOT ゲート追加で circuit.json を作成
    When "qni add X --control 0 --qubit 1 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 2,
        "cols": [
          ["•", "X"]
        ]
      }
      """
