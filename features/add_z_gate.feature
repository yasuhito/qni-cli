Feature: Z ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Z ゲートを追加したい

  Scenario: Z ゲート追加で circuit.json を作成
    When "qni add Z --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Z"]
        ]
      }
      """
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ Z ├
          └───┘
      """
